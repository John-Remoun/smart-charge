const express = require('express');
const { protect } = require('../middleware/auth');
const { checkout, processPayment } = require('../controllers/paymentController');
const router = express.Router();

router.post('/checkout', protect, checkout);
router.post('/process', protect, processPayment);

module.exports = router;
