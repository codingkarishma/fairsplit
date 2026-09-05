const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OCRService = require('../services/ocr.service');

const router = express.Router();

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

const SKIP_KEYWORDS =
  /subtotal|^\s*total\b|grand total|tax|tip|cash|change|tendered|balance|card|amount due|thank you/i;
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/bmp',
      'image/webp',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported format. Use JPG, PNG, BMP, WebP, or TXT'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/extract', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No receipt image uploaded' });
  }

  try {
    if (req.file.mimetype === 'text/plain') {
      const lines = fs
        .readFileSync(req.file.path, 'utf-8')
        .split('\n')
        .filter((line) => line.trim());
      const items = [];

      for (const line of lines) {
        if (SKIP_KEYWORDS.test(line)) continue;
        const matches = [...line.matchAll(/[₹$]?\s*([0-9,]+\.?[0-9]*)/g)];
        if (!matches.length) continue;
        const lastMatch = matches[matches.length - 1];
        const price = parseFloat(lastMatch[1].replace(/,/g, ''));
        if (isNaN(price) || price <= 0) continue;
        const name = line
          .slice(0, lastMatch.index)
          .trim()
          .replace(/[₹$\-—:|]\s*$/, '')
          .trim();
        if (name.length >= 2) items.push({ name, price, rawLine: line });
      }

      return res.json({ items });
    }

    const items = await OCRService.extractItems(req.file.path);
    res.json({ items });
  } catch (err) {
    console.error('OCR extraction failed:', err);
    res.status(500).json({ error: 'Failed to process receipt image' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
