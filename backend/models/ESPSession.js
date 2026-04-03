const mongoose = require('mongoose');

const espSessionSchema = new mongoose.Schema({
  type: { type: String, enum: ['phone', 'powerbank'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  minutes: Number,
  amount: Number,
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  startTime: Date,
  endTime: Date,
  doorOpened: Boolean,
  doorClosed: Boolean,
  relayActive: Boolean,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ESPSession', espSessionSchema);
