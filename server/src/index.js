import express from 'express';
import cors from 'cors';
import { PORT, HOST, STORAGE_DIR, DATABASE_PATH, ensureStorageDirectories } from './config.js';
import { getFilesCount, getDatabase } from './db.js';
import filesRouter from './routes/files.js';
import { generalRateLimiter } from './security.js';

// Ensure storage and database directories exist
ensureStorageDirectories();
// Initialize SQLite tables
getDatabase();

const app = express();

// Trust proxy for rate limiting when behind Cloudflare Tunnel or reverse proxies
app.set('trust proxy', 1);

// CORS configuration: allow Vercel domains, localhost, and custom tunnel hosts
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow any localhost, any vercel.app preview/production, or trycloudflare
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.trycloudflare.com') ||
        process.env.ALLOWED_ORIGINS?.split(',').includes(origin)
      ) {
        return callback(null, true);
      }
      // For public file viewing & QR sharing, allow all origins for GET requests
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-delete-token']
  })
);

app.use(express.json());
app.use(generalRateLimiter);

// Health & Diagnostic Endpoint
app.get('/api/health', (req, res) => {
  try {
    const activeCount = getFilesCount();
    return res.json({
      status: 'ok',
      service: 'excel-qr-local-backend',
      timestamp: new Date().toISOString(),
      storage: {
        directory: STORAGE_DIR,
        database: DATABASE_PATH,
        activeFiles: activeCount
      },
      uptimeSeconds: Math.floor(process.uptime())
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// Mount file operations router
app.use('/api/files', filesRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// Global safe error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(` Excel QR Generator - Local Storage Backend Server `);
  console.log(`====================================================`);
  console.log(` Listening on: http://${HOST}:${PORT}`);
  console.log(` Storage dir : ${STORAGE_DIR}`);
  console.log(` SQLite DB   : ${DATABASE_PATH}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Ready for Cloudflare Tunnel connection!`);
  console.log(`====================================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down local backend...');
  server.close(() => {
    process.exit(0);
  });
});
