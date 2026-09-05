const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OCRService = require('../services/ocr.service');

const router = express.Router();

// Configure multer to save uploads to backend/src/uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// POST /extract — upload receipt image, run OCR, return extracted items
router.post('/extract', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No receipt image uploaded' });
  }

  try {
    const items = await OCRService.extractItems(req.file.path);
    res.json({ items });
  } catch (err) {
    console.error('OCR extraction failed:', err);
    res.status(500).json({ error: 'Failed to process receipt image' });
  }
});

module.exports = router;
