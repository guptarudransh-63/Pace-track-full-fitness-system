import { Router } from 'express';
import { createGoal, getUserGoals, deleteGoal } from '../controllers/goal.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createGoal);
router.get('/', requireAuth, getUserGoals);
router.delete('/:id', requireAuth, deleteGoal);

export default router;
