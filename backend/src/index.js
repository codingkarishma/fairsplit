const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const ocrRouter = require('./routes/ocr');
const billsRouter = require('./routes/bills');

// Register models (so Mongoose knows the schemas)
require('./models/Bill');
require('./models/Item');
require('./models/Participant');

const app = express();
const server = http.createServer(app);
const billCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many bill creation requests, please try again later.',
  },
});
const ocrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many OCR requests, please try again later.' },
});
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const allowedOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(null, false);
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/bills', billCreateLimiter);
app.post('/api/ocr/extract', ocrLimiter);
app.use('/api/ocr', ocrRouter);
app.use('/api/bills', billsRouter);

app.get('/', (req, res) => res.json({ message: 'FairSplit API is running' }));

// Socket.io connection (real-time claims will go here)
io.on('connection', (socket) => console.log('User connected:', socket.id));

// MongoDB connection (placeholder — set MONGODB_URI when ready)
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/fairsplit';
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { app, server, io };
