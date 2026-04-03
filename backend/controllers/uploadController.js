const User = require('../models/User');

const rel = (filename) => `/uploads/${filename}`;

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const profilePhoto = rel(req.file.filename);
    const user = await User.findByIdAndUpdate(req.user._id, { profilePhoto }, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadIdFront = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const idFrontPhoto = rel(req.file.filename);
    const user = await User.findByIdAndUpdate(req.user._id, { idFrontPhoto }, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadIdBack = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const idBackPhoto = rel(req.file.filename);
    const user = await User.findByIdAndUpdate(req.user._id, { idBackPhoto }, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
