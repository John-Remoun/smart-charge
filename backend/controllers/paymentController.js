const ESPSession = require('../models/ESPSession');
const PaymentMethod = require('../models/PaymentMethod');
const { enqueueCommand } = require('../services/deviceQueue');

const EGP_PER_MINUTE = 1;

exports.checkout = async (req, res) => {
  try {
    const { minutes, type, paymentMethodId } = req.body;
    const m = Number(minutes);
    if (!['phone', 'powerbank'].includes(type) || !Number.isFinite(m) || m <= 0) {
      return res.status(400).json({ message: 'Invalid type or duration' });
    }
    if (!paymentMethodId) return res.status(400).json({ message: 'paymentMethodId is required' });

    const method = await PaymentMethod.findOne({ _id: paymentMethodId, userId: req.user._id });
    if (!method) return res.status(400).json({ message: 'Payment method not found' });

    const amount = Math.round(m * EGP_PER_MINUTE * 100) / 100;
    const start = new Date();
    const session = await ESPSession.create({
      type,
      userId: req.user._id,
      minutes: m,
      amount,
      status: 'active',
      startTime: start,
      endTime: new Date(start.getTime() + m * 60 * 1000)
    });

    await enqueueCommand('station', 'session_start', {
      service: type,
      sessionId: String(session._id),
      minutes: m,
      userId: String(req.user._id)
    });

    res.json({
      success: true,
      message: `Paid ${amount} EGP`,
      session
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { sessionId, paymentMethodId } = req.body;
    if (!sessionId || !paymentMethodId) {
      return res.status(400).json({ message: 'sessionId and paymentMethodId are required' });
    }

    const session = await ESPSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not your session' });
    }
    if (session.status !== 'pending') {
      return res.status(400).json({ message: 'Session is not awaiting payment' });
    }

    const method = await PaymentMethod.findOne({ _id: paymentMethodId, userId: req.user._id });
    if (!method) return res.status(400).json({ message: 'Payment method not found' });

    const expectedAmount = (session.minutes || 0) * EGP_PER_MINUTE;
    if (session.amount == null) session.amount = expectedAmount;

    session.status = 'active';
    session.startTime = new Date();
    session.endTime = new Date(Date.now() + (session.minutes || 0) * 60 * 1000);
    await session.save();

    await enqueueCommand('station', 'session_start', {
      service: session.type,
      sessionId: String(session._id),
      minutes: session.minutes,
      userId: String(req.user._id)
    });

    res.json({
      success: true,
      message: `Paid ${session.amount ?? expectedAmount} EGP`,
      session
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
