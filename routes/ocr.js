const express = require('express');
const multer  = require('multer');
const { requireAuth } = require('../middleware/auth');
const { ocrScan }    = require('../controllers/ocrController');

// Store uploads in memory — no disk I/O, we process and discard
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Sirf image files allowed hain (jpg, png, webp, etc.)'));
  },
});

const router = express.Router();

// POST /api/ocr/scan  — accepts multipart/form-data with field "image"
router.post('/scan', requireAuth, upload.single('image'), ocrScan);

module.exports = router;
