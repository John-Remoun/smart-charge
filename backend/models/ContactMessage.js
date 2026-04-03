const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
