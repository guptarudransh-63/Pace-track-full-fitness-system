import { Router } from 'express';
import {
  toggleFollow,
  toggleKudos,
  getKudosList,
  addComment,
  getComments,
  getFeed,
} from '../controllers/social.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/feed', optionalAuth, getFeed);
router.post('/follow/:userId', requireAuth, toggleFollow);
router.post('/activities/:activityId/kudos', requireAuth, toggleKudos);
router.get('/activities/:activityId/kudos', optionalAuth, getKudosList);
router.post('/activities/:activityId/comments', requireAuth, addComment);
router.get('/activities/:activityId/comments', optionalAuth, getComments);

export default router;
