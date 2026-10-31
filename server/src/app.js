import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import activityRoutes from './routes/activity.routes.js';
import segmentRoutes from './routes/segment.routes.js';
import socialRoutes from './routes/social.routes.js';
import clubRoutes from './routes/club.routes.js';
import goalRoutes from './routes/goal.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import searchRoutes from './routes/search.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', service: 'PaceTrack API', timestamp: new Date().toISOString() });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/activities', activityRoutes);
  app.use('/api/v1/segments', segmentRoutes);
  app.use('/api/v1/social', socialRoutes);
  app.use('/api/v1/clubs', clubRoutes);
  app.use('/api/v1/goals', goalRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/search', searchRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
