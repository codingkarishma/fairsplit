const mongoose = require('mongoose');
const { Schema } = mongoose;

// Participant = a person who has claimed an item on a bill.
// Belongs to a Bill via billId.
const ParticipantSchema = new Schema({
  billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
  name: { type: String, required: true },
  isHost: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Participant', ParticipantSchema);
