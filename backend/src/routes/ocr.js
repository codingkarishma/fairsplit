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
    cb(
      new Error(
        "PDFs aren't supported yet — upload a photo or screenshot of the receipt",
      ),
    );
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/extract', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No receipt image uploaded' });
  }

  try {
    if (req.file.mimetype === 'text/plain') {
      const text = fs.readFileSync(req.file.path, 'utf-8');
      return res.json({
        items: OCRService.parseReceiptLines(text.split('\n')),
      });
    }

    const items = await OCRService.extractItems(req.file.path);
    res.json({ items });
  } catch (err) {
    console.error('OCR extraction failed:', err);
    res.status(500).json({ error: 'Failed to process receipt image' });
  } finally {
    fs.unlink(req.file.path, (unlinkError) => {
      if (unlinkError) {
        console.error('Failed to remove uploaded receipt:', unlinkError);
      }
    });
  }
});

router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
