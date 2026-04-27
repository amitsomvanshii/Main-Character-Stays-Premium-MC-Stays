import express from 'express'; // Triggering TS re-check 
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import authRoutes from './routes/auth';
import pgRoutes from './routes/pg';
import advancedRoutes from './routes/advanced';
import adminRoutes from './routes/admin';
import residentRoutes from './routes/resident';
import leadRoutes from './routes/lead';
import chatRoutes from './routes/chat';
import userRoutes from './routes/user';
import "dotenv/config";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Attach io to req for routes to use if needed
app.use((req: any, res, next) => {
  req.io = io;
  next();
});

// File-based Logger for Debugging
app.use((req, res, next) => {
  const fs = require('fs');
  const log = `${new Date().toISOString()} ${req.method} ${req.url}\n`;
  fs.appendFileSync(path.join(process.cwd(), 'request_log.txt'), log);
  next();
});

app.use(cors());
app.use(express.json());

// Serve uploaded PG photos as static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pgs', pgRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resident', residentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Smart PG Finder API is running.' });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined personal room user_${userId}`);
  });

  socket.on('join_pg_room', (pgId) => {
    socket.join(`pg_${pgId}`);
    console.log(`Socket ${socket.id} joined room pg_${pgId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    message: `Route ${req.method} ${req.url} Not Found`,
    suggestion: "Check your API path or method."
  });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
