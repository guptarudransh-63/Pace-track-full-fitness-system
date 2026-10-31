import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';

import { User } from './models/User.js';
import { seedDatabase } from './scripts/seed.js';

dotenv.config();

const PORT = process.env.PORT || 5001;
const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO for real-time fitness social events
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

io.on('connection', (socket) => {
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Attach io instance to app
app.set('io', io);

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database is empty. Automatically seeding demo athletes, routes, and segments...');
      await seedDatabase(false);
    }

    server.listen(PORT, () => {
      console.log(`PaceTrack Server running on port ${PORT}`);
      console.log(`API Base: http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    console.error('Failed to start PaceTrack server:', err);
    process.exit(1);
  }
}

startServer();

export { app, server, io };
