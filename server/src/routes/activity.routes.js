import { Router } from 'express';
import multer from 'multer';
import {
  uploadGpx,
  createManualActivity,
  getActivityById,
  getActivityRoute,
  getActivitySplits,
  getActivitySegments,
  updateActivity,
  deleteActivity,
  getUserActivities,
} from '../controllers/activity.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(gpx|xml)$/i) || file.mimetype.includes('xml') || file.mimetype.includes('gpx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .gpx files are supported.'));
    }
  },
});

const router = Router();

router.post('/upload', requireAuth, upload.single('file'), uploadGpx);
router.post('/manual', requireAuth, createManualActivity);
router.get('/:id', optionalAuth, getActivityById);
router.get('/:id/route', optionalAuth, getActivityRoute);
router.get('/:id/splits', optionalAuth, getActivitySplits);
router.get('/:id/segments', optionalAuth, getActivitySegments);
router.patch('/:id', requireAuth, updateActivity);
router.delete('/:id', requireAuth, deleteActivity);
router.get('/user/:userId', optionalAuth, getUserActivities);

export default router;
