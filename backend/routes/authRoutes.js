const express = require('express');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { uploadProfilePhoto, uploadIdFront, uploadIdBack } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const router = express.Router();

const uploadPhotoMiddleware = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Invalid file' });
    next();
  });
};

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/upload/profile', protect, uploadPhotoMiddleware, uploadProfilePhoto);
router.post('/upload/id-front', protect, uploadPhotoMiddleware, uploadIdFront);
router.post('/upload/id-back', protect, uploadPhotoMiddleware, uploadIdBack);

module.exports = router;
