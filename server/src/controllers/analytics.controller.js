import { getUserAnalytics } from '../services/analyticsService.js';
import { User } from '../models/User.js';
import { Follow } from '../models/Social.js';

export async function getDashboardAnalytics(req, res, next) {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const analytics = await getUserAnalytics(req.user._id, { days });
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function getAthleteProfileStats(req, res, next) {
  try {
    const userId = req.params.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Athlete ID or login required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Athlete not found.' });
    }

    let isFollowing = false;
    if (req.user && String(req.user._id) !== String(userId)) {
      const follow = await Follow.findOne({ follower: req.user._id, following: userId });
      isFollowing = !!follow;
    }

    const analytics = await getUserAnalytics(userId, { days: 365 });

    res.json({
      athlete: user.toSafeObject(),
      stats: analytics.lifetime,
      weeklySummary: analytics.weeklySummary,
      sportDistribution: analytics.sportDistribution,
      personalRecords: analytics.personalRecords,
      isFollowing,
    });
  } catch (err) {
    next(err);
  }
}
