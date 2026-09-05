const mongoose = require('mongoose');
const { Schema } = mongoose;

// Item = one line on the receipt, e.g. "2x Fries — $10.00".
// `price` is the TOTAL line amount as printed on the receipt.
// `quantity` is how many units that line contains.
//
// claims: array of participant claims. claims.length must NEVER
// exceed quantity. This is enforced atomically at the DB write
// level (via $expr + findOneAndUpdate), not in the frontend.
const ItemSchema = new Schema({
  billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },

  // OCR-extracted name; host reviews and corrects before publishing.
  name: { type: String, required: true },

  // TOTAL price for this line as printed on the receipt.
  // E.g. "2x Fries at $5 each" → price: 10, quantity: 2.
  price: { type: Number, required: true },

  // How many units this line represents.
  quantity: { type: Number, required: true, default: 1 },

  // Who has claimed this item. Each entry = one participant's claim.
  // claims.length must never exceed quantity — enforced atomically
  // in the claim handler via findOneAndUpdate with $expr check.
  claims: [{
    participantId: { type: Schema.Types.ObjectId, ref: 'Participant' },
    claimedAt: { type: Date, default: Date.now },
  }],
});

module.exports = mongoose.model('Item', ItemSchema);
