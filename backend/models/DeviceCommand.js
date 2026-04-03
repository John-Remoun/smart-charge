const mongoose = require('mongoose');

const deviceCommandSchema = new mongoose.Schema({
  slug: { type: String, enum: ['phone', 'powerbank', 'station'], required: true },
  action: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['pending', 'delivered', 'completed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  deliveredAt: Date
});

deviceCommandSchema.index({ slug: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model('DeviceCommand', deviceCommandSchema);
