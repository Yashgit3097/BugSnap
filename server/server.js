import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import http from 'http';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { initWebSocket } from './config/socket.js';

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── CORS Configuration 
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Auto-create uploads/ directory ───────────────────────────────
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
  console.log('Created uploads/ directory');
}

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/upload', uploadRoutes);

// ── Health check route ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Jam.dev Clone API is running ✓', status: 'ok' });
});

// ── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error('Server Error:', err.message);
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ MongoDB: ${process.env.MONGO_URI}`);
  console.log(`✓ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : '⚠ NOT SET'}`);
});
