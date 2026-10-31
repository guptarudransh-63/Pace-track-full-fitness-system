import { Router } from 'express';
import {
  getDashboardAnalytics,
  getAthleteProfileStats,
} from '../controllers/analytics.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', requireAuth, getDashboardAnalytics);
router.get('/athlete/:userId?', optionalAuth, getAthleteProfileStats);

export default router;
