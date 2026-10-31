import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, globalSearch);

export default router;
