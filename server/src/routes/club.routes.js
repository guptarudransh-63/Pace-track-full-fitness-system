import { Router } from 'express';
import {
  createClub,
  getClubs,
  getClubById,
  joinClub,
  leaveClub,
  getClubLeaderboard,
  getClubMembers,
} from '../controllers/club.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createClub);
router.get('/', optionalAuth, getClubs);
router.get('/:id', optionalAuth, getClubById);
router.post('/:id/join', requireAuth, joinClub);
router.post('/:id/leave', requireAuth, leaveClub);
router.get('/:id/leaderboard', optionalAuth, getClubLeaderboard);
router.get('/:id/members', optionalAuth, getClubMembers);

export default router;
