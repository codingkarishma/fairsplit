const express = require('express');
const { nanoid } = require('nanoid');
const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Item = require('../models/Item');
const Participant = require('../models/Participant');
const { calculateBillTotals } = require('../services/totals.service');

const router = express.Router();

async function withDetails(bill) {
  const [items, participants] = await Promise.all([
    Item.find({ billId: bill._id }),
    Participant.find({ billId: bill._id }),
  ]);
  const billDetails = bill.toObject();
  delete billDetails.hostCode;
  return { ...billDetails, items, participants };
}

function hostCodeMatches(req, bill) {
  return (
    Boolean(req.get('X-Host-Code')) && req.get('X-Host-Code') === bill.hostCode
  );
}

function shareCodeMatches(req, bill) {
  const shareCode = req.body.shareCode || req.get('X-Share-Code');
  return Boolean(shareCode) && shareCode === bill.shareCode;
}

function isInvalidId(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: 'Invalid bill id' });
    return true;
  }
  return false;
}

function isInvalidItemId(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.itemId)) {
    res.status(400).json({ error: 'Invalid item id' });
    return true;
  }
  return false;
}

async function findBillForParticipantAction(req, res) {
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404).json({ error: 'Bill not found' });
    return null;
  }
  if (!shareCodeMatches(req, bill)) {
    res.status(403).json({ error: 'Invalid share code' });
    return null;
  }
  if (bill.status === 'closed') {
    res
      .status(409)
      .json({ error: 'Bill is closed, no further changes allowed' });
    return null;
  }
  if (bill.status !== 'open') {
    res.status(409).json({ error: 'Bill is not open for claims' });
    return null;
  }
  return bill;
}

router.post('/', async (req, res) => {
  try {
    const {
      hostName,
      restaurantName,
      taxPercent,
      tipPercent,
      currency,
      hostUpiId,
    } = req.body;
    if (currency !== undefined && !['INR', 'GBP', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }
    if (!hostName)
      return res.status(400).json({ error: 'hostName is required' });

    if (hostUpiId !== undefined && hostUpiId !== null && hostUpiId !== '') {
      const upiPattern = /^[\w.-]+@[\w.-]+$/;
      if (!upiPattern.test(hostUpiId)) {
        return res.status(400).json({
          error:
            "hostUpiId doesn't look like a valid UPI ID, expected format: name@bank",
        });
      }
    }

    const bill = await Bill.create({
      hostName,
      restaurantName,
      taxPercent,
      tipPercent,
      currency,
      hostUpiId,
      status: 'draft',
      shareCode: nanoid(6),
      hostCode: nanoid(12),
    });
    res.status(201).json(bill);
  } catch (err) {
    console.error('Bill creation failed:', err);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

router.get('/join/:shareCode', async (req, res) => {
  try {
    const bill = await Bill.findOne({ shareCode: req.params.shareCode });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(await withDetails(bill));
  } catch (err) {
    console.error('Bill lookup failed:', err);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

router.get('/:id', async (req, res) => {
  if (isInvalidId(req, res)) return;
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(await withDetails(bill));
  } catch (err) {
    console.error('Bill lookup failed:', err);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

router.post('/:id/publish', async (req, res) => {
  if (isInvalidId(req, res)) return;
  try {
    const existingBill = await Bill.findById(req.params.id);
    if (!existingBill) return res.status(404).json({ error: 'Bill not found' });
    if (!hostCodeMatches(req, existingBill)) {
      return res.status(403).json({ error: 'Invalid host code' });
    }
    if (existingBill.status === 'open') {
      return res.status(409).json({ error: 'Bill is already published' });
    }
    if (existingBill.status === 'closed') {
      return res.status(409).json({ error: 'Bill is already closed' });
    }
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, status: 'draft' },
      { status: 'open' },
      { new: true },
    );
    if (!bill) return res.status(404).json({ error: 'Draft bill not found' });
    res.json(bill);
  } catch (err) {
    console.error('Bill publish failed:', err);
    res.status(500).json({ error: 'Failed to publish bill' });
  }
});

router.post('/:id/participants', async (req, res) => {
  if (isInvalidId(req, res)) return;
  try {
    const { name } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (!shareCodeMatches(req, bill)) {
      return res.status(403).json({ error: 'Invalid share code' });
    }
    if (bill.status !== 'open') {
      return res.status(409).json({ error: 'Bill is not open for joining' });
    }
    if (!name) return res.status(400).json({ error: 'name is required' });
    const participant = await Participant.create({ billId: bill._id, name });
    res.status(201).json(participant);
  } catch (err) {
    console.error('Participant creation failed:', err);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

router.post('/:id/items/:itemId/claim', async (req, res) => {
  if (isInvalidId(req, res) || isInvalidItemId(req, res)) return;
  try {
    const bill = await findBillForParticipantAction(req, res);
    if (!bill) return;

    const { participantId, customAmountCents = null } = req.body;
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ error: 'Valid participantId is required' });
    }
    if (
      customAmountCents !== null &&
      (!Number.isInteger(customAmountCents) || customAmountCents < 0)
    ) {
      return res.status(400).json({
        error: 'customAmountCents must be a non-negative integer or null',
      });
    }
    const participant = await Participant.findOne({
      _id: participantId,
      billId: bill._id,
    });
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const item = await Item.findOneAndUpdate(
      {
        _id: req.params.itemId,
        billId: bill._id,
        'claims.participantId': { $ne: participant._id },
        $expr: {
          $lte: [
            {
              $add: [
                {
                  $sum: {
                    $map: {
                      input: { $ifNull: ['$claims', []] },
                      as: 'claim',
                      in: { $ifNull: ['$$claim.customAmountCents', 0] },
                    },
                  },
                },
                customAmountCents === null ? 0 : customAmountCents,
              ],
            },
            '$priceCents',
          ],
        },
      },
      {
        $push: {
          claims: {
            participantId: participant._id,
            customAmountCents,
          },
        },
      },
      { new: true },
    );
    if (!item) {
      const existingItem = await Item.findOne({
        _id: req.params.itemId,
        billId: bill._id,
      });
      if (!existingItem)
        return res.status(404).json({ error: 'Item not found' });
      if (
        existingItem.claims.some((claim) =>
          claim.participantId.equals(participant._id),
        )
      ) {
        return res.status(409).json({
          error: 'Item already claimed by this participant',
        });
      }
      return res.status(400).json({
        error: 'Custom amount would exceed remaining item price',
      });
    }
    return res.json(item);
  } catch (err) {
    console.error('Item claim failed:', err);
    return res.status(500).json({ error: 'Failed to claim item' });
  }
});

router.post('/:id/items/:itemId/unclaim', async (req, res) => {
  if (isInvalidId(req, res) || isInvalidItemId(req, res)) return;
  try {
    const bill = await findBillForParticipantAction(req, res);
    if (!bill) return;

    const { participantId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ error: 'Valid participantId is required' });
    }
    const participant = await Participant.findOne({
      _id: participantId,
      billId: bill._id,
    });
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.itemId, billId: bill._id },
      { $pull: { claims: { participantId: participant._id } } },
      { new: true },
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    return res.json(item);
  } catch (err) {
    console.error('Item unclaim failed:', err);
    return res.status(500).json({ error: 'Failed to unclaim item' });
  }
});

router.patch('/:id/items', async (req, res) => {
  if (isInvalidId(req, res)) return;
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (!hostCodeMatches(req, bill)) {
      return res.status(403).json({ error: 'Invalid host code' });
    }
    if (bill.status !== 'draft') {
      return res.status(409).json({
        error: 'Items can only be edited before the bill is published',
      });
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    const normalizedItems = items.map((item) => ({
      billId: bill._id,
      name: typeof item.name === 'string' ? item.name.trim() : '',
      priceCents: item.priceCents,
      quantity: item.quantity === undefined ? 1 : item.quantity,
    }));
    const invalidItem = normalizedItems.find(
      (item) =>
        !item.name ||
        !Number.isInteger(item.priceCents) ||
        item.priceCents <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0,
    );
    if (invalidItem) {
      return res.status(400).json({
        error:
          'Each item requires a non-empty name, a positive integer priceCents, and a positive integer quantity',
      });
    }

    await Item.deleteMany({ billId: bill._id });
    const created = await Item.insertMany(normalizedItems);
    return res.status(201).json({ items: created });
  } catch (err) {
    console.error('Bulk item replacement failed:', err);
    return res.status(500).json({ error: 'Failed to replace bill items' });
  }
});

router.patch('/:id/items/:itemId', async (req, res) => {
  if (isInvalidId(req, res) || isInvalidItemId(req, res)) return;
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (!hostCodeMatches(req, bill)) {
      return res.status(403).json({ error: 'Invalid host code' });
    }
    if (bill.status !== 'draft') {
      return res.status(409).json({
        error: 'Items can only be edited before the bill is published',
      });
    }

    const allowedFields = ['name', 'priceCents', 'quantity'];
    const updates = Object.fromEntries(
      allowedFields
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, req.body[field]]),
    );
    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one item field is required' });
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.itemId, billId: bill._id },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    return res.json(item);
  } catch (err) {
    console.error('Item edit failed:', err);
    return res.status(500).json({ error: 'Failed to edit item' });
  }
});

router.post('/:id/items', async (req, res) => {
  if (isInvalidId(req, res)) return;
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (!hostCodeMatches(req, bill)) {
      return res.status(403).json({ error: 'Invalid host code' });
    }
    if (bill.status !== 'draft') {
      return res.status(409).json({
        error: 'Items can only be added before the bill is published',
      });
    }

    const { name, priceCents, quantity = 1 } = req.body;
    if (!name || !Number.isInteger(priceCents) || priceCents < 0) {
      return res.status(400).json({
        error: 'name and a non-negative integer priceCents are required',
      });
    }

    const item = await Item.create({
      billId: bill._id,
      name,
      priceCents,
      quantity,
    });
    return res.status(201).json(item);
  } catch (err) {
    console.error('Item creation failed:', err);
    return res.status(500).json({ error: 'Failed to add item' });
  }
});

router.post('/:id/close', async (req, res) => {
  if (isInvalidId(req, res)) return;
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (!hostCodeMatches(req, bill)) {
      return res.status(403).json({ error: 'Invalid host code' });
    }
    if (bill.status === 'closed') {
      return res.status(409).json({ error: 'Bill is already closed' });
    }
    if (bill.status !== 'open') {
      return res.status(409).json({ error: 'Only open bills can be closed' });
    }

    const closedBill = await Bill.findOneAndUpdate(
      { _id: bill._id, status: 'open' },
      { status: 'closed' },
      { new: true },
    );
    if (!closedBill) {
      return res
        .status(409)
        .json({ error: 'Bill status changed before closing' });
    }

    const [items, participants] = await Promise.all([
      Item.find({ billId: bill._id }),
      Participant.find({ billId: bill._id }),
    ]);
    let totals;
    try {
      totals = calculateBillTotals({
        items,
        participants,
        taxPercent: bill.taxPercent,
        tipPercent: bill.tipPercent,
      });
    } catch (err) {
      if (err.message === 'Cannot finalize a bill with no participants') {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }

    // UPI links are only generated for INR bills — UPI itself does not
    // support GBP/USD settlement, this is not a missing feature.
    const { hostUpiId, hostName, currency, _id: billId } = closedBill;

    const breakdownWithUpi = totals.breakdown.map((entry) => {
      let upiLink = null;

      if (currency === 'INR' && hostUpiId && entry.finalTotalCents > 0) {
        const amount = (entry.finalTotalCents / 100).toFixed(2);
        const encodedHostName = encodeURIComponent(hostName);
        upiLink = `upi://pay?pa=${hostUpiId}&pn=${encodedHostName}&am=${amount}&cu=INR&tn=FairSplit:${billId}`;
      }

      return { ...entry, upiLink };
    });

    const billWithBreakdown = await Bill.findByIdAndUpdate(
      bill._id,
      { finalBreakdown: breakdownWithUpi },
      { new: true },
    );

    return res.json({
      bill: billWithBreakdown,
      totals,
      breakdown: breakdownWithUpi,
    });
  } catch (err) {
    console.error('Bill close failed:', err);
    return res.status(500).json({ error: 'Failed to close bill' });
  }
});

module.exports = router;
