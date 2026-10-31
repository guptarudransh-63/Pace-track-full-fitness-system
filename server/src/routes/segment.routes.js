import { Router } from 'express';
import {
  createSegment,
  getSegments,
  getSegmentById,
  getSegmentLeaderboard,
} from '../controllers/segment.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createSegment);
router.get('/', optionalAuth, getSegments);
router.get('/:id', optionalAuth, getSegmentById);
router.get('/:id/leaderboard', optionalAuth, getSegmentLeaderboard);

export default router;
