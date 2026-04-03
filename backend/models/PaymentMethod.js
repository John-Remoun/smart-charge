const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardNumber: { type: String, required: true },
  cardHolder: { type: String, required: true },
  expiryMonth: { type: String, required: true },
  expiryYear: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
