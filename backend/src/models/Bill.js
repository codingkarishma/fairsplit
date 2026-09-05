const mongoose = require('mongoose');
const { Schema } = mongoose;

// Top-level session document for a restaurant bill.
// One Bill per shared receipt. Participants join via shareCode,
// no auth required.
const BillSchema = new Schema({
  // Name of the host who paid the bill.
  hostName: { type: String, required: true },

  // URL/path to the uploaded receipt image (V1: local disk).
  receiptImageUrl: { type: String },

  // Best-effort name from OCR; host can correct during review.
  restaurantName: { type: String },

  // Tax/tip added by host during review; split proportionally later.
  taxAmount: { type: Number, default: 0 },
  tipAmount: { type: Number, default: 0 },

  // Lifecycle state:
  //   draft  — bill created, not published yet
  //   open   — published, participants can join and claim
  //   closed — finalized, totals locked
  status: {
    type: String,
    enum: ['draft', 'open', 'closed'],
    default: 'draft',
  },

  createdAt: { type: Date, default: Date.now },

  // Short unique code used in the join link /bill/join/:shareCode.
  shareCode: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('Bill', BillSchema);
