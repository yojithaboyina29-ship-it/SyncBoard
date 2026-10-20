import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocketIO } from './sockets/socketHandler.js';
import prisma from './config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Middleware
app.use(
  cors({
    origin: [ENV.CLIENT_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'degraded', database: 'disconnected', error: err.message });
  }
});

// API Routes
app.use('/api', apiRouter);

// Serve client in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Global Error Handler
app.use(errorHandler);

server.listen(ENV.PORT, () => {
  console.log(`🚀 SyncBoard Server running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
  console.log(`🔌 WebSocket server active`);
});

export { app, server };
