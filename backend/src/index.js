require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const ocrRouter = require('./routes/ocr');
const billsRouter = require('./routes/bills');

// Register models (so Mongoose knows the schemas)
require('./models/Bill');
require('./models/Item');
require('./models/Participant');

const app = express();
const server = http.createServer(app);

const rateLimitWindowMs = Number.parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000',
  10,
);
const rateLimitMaxRequests = Number.parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || '100',
  10,
);

const billCreateLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMaxRequests,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many bill creation requests, please try again later.',
  },
});

const ocrLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMaxRequests,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many OCR requests, please try again later.' },
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      console.warn('Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.post('/api/bills', billCreateLimiter);
app.post('/api/ocr/extract', ocrLimiter);
app.use('/api/ocr', ocrRouter);
app.use('/api/bills', billsRouter);

app.get('/', (req, res) => res.json({ message: 'FairSplit API is running' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Fail fast in production if MONGODB_URI is missing
if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not set in production');
  process.exit(1);
}

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/fairsplit';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () =>
      console.log(`Server listening on ${PORT}`),
    );
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { app, server };
