const mongoose = require('mongoose');

/** Last known state reported by each ESP32 (phone station vs powerbank station). */
const deviceTelemetrySchema = new mongoose.Schema({
  slug: { type: String, enum: ['phone', 'powerbank', 'station'], required: true, unique: true },
  doorOpen: { type: Boolean, default: false },
  relayActive: { type: Boolean, default: false },
  timeLeftSec: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
  phoneDoorOpen: { type: Boolean, default: false },
  powerbankDoorOpen: { type: Boolean, default: false },
  phoneTimeLeftSec: { type: Number, default: 0 },
  powerbankTimeLeftSec: { type: Number, default: 0 },
  phoneActive: { type: Boolean, default: false },
  powerbankActive: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DeviceTelemetry', deviceTelemetrySchema);
