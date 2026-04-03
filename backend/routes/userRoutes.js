const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/payment-methods', protect, async (req, res) => {
  const PaymentMethod = require('../models/PaymentMethod');
  const methods = await PaymentMethod.find({ userId: req.user._id });
  res.json(methods);
});

router.post('/payment-methods', protect, async (req, res) => {
  const PaymentMethod = require('../models/PaymentMethod');
  const { cardNumber, cardHolder, expiryMonth, expiryYear } = req.body;
  const method = await PaymentMethod.create({ userId: req.user._id, cardNumber, cardHolder, expiryMonth, expiryYear });
  res.json(method);
});

module.exports = router;
