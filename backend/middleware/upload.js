const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const userId = req.user?._id?.toString() || 'anon';
    const ext = path.extname(file.originalname) || '.jpg';
    const base = path.basename(file.fieldname || 'photo', ext).replace(/[^a-z0-9-_]/gi, '');
    cb(null, `${userId}_${base}_${Date.now()}${ext}`);
  }
});

const imageFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error('Only JPEG, PNG, or WebP images are allowed'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

module.exports = { upload, uploadsDir };
