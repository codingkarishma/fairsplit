const express = require('express');
const { nanoid } = require('nanoid');
const Bill = require('../models/Bill');
const Item = require('../models/Item');
const Participant = require('../models/Participant');

const router = express.Router();

async function withDetails(bill) {
  const [items, participants] = await Promise.all([
    Item.find({ billId: bill._id }),
    Participant.find({ billId: bill._id }),
  ]);
  return { ...bill.toObject(), items, participants };
}

router.post('/', async (req, res) => {
  try {
    const { hostName, restaurantName, taxAmount, tipAmount } = req.body;
    if (!hostName)
      return res.status(400).json({ error: 'hostName is required' });
    const bill = await Bill.create({
      hostName,
      restaurantName,
      taxAmount,
      tipAmount,
      status: 'draft',
      shareCode: nanoid(6),
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
  try {
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
  try {
    const { name } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (!name) return res.status(400).json({ error: 'name is required' });
    const participant = await Participant.create({ billId: bill._id, name });
    res.status(201).json(participant);
  } catch (err) {
    console.error('Participant creation failed:', err);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

module.exports = router;
