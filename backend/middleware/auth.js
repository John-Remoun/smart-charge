const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) next();
  else res.status(403).json({ message: 'Admin access required' });
};

const superadmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') next();
  else res.status(403).json({ message: 'Superadmin access required' });
};

module.exports = { protect, admin, superadmin };
