import { Follow, Kudos, Comment, Notification } from '../models/Social.js';
import { Activity } from '../models/Activity.js';
import { User } from '../models/User.js';
import { canViewActivity, sanitizeActivitySummary } from '../services/privacyService.js';

export async function toggleFollow(req, res, next) {
  try {
    const targetUserId = req.params.userId;
    if (String(req.user._id) === String(targetUserId)) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      following: targetUserId,
    });

    if (existingFollow) {
      await Follow.findByIdAndDelete(existingFollow._id);
      return res.json({ following: false, message: `Unfollowed ${targetUser.name}` });
    }

    await Follow.create({
      follower: req.user._id,
      following: targetUserId,
    });

    // Create notification
    if (targetUser.notificationPreferences?.follows) {
      await Notification.create({
        recipient: targetUserId,
        sender: req.user._id,
        type: 'follow',
        message: `${req.user.name} started following you.`,
      });
    }

    res.json({ following: true, message: `Now following ${targetUser.name}` });
  } catch (err) {
    next(err);
  }
}

export async function toggleKudos(req, res, next) {
  try {
    const activityId = req.params.activityId;
    const activity = await Activity.findById(activityId);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    const hasAccess = await canViewActivity(activity, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const existingKudo = await Kudos.findOne({
      activity: activityId,
      user: req.user._id,
    });

    if (existingKudo) {
      await Kudos.findByIdAndDelete(existingKudo._id);
      const count = await Kudos.countDocuments({ activity: activityId });
      activity.kudosCount = count;
      await activity.save();
      return res.json({ kudod: false, kudosCount: count });
    }

    await Kudos.create({
      activity: activityId,
      user: req.user._id,
    });

    const count = await Kudos.countDocuments({ activity: activityId });
    activity.kudosCount = count;
    await activity.save();

    // Create notification if not own activity
    if (String(activity.user) !== String(req.user._id)) {
      await Notification.create({
        recipient: activity.user,
        sender: req.user._id,
        type: 'kudos',
        entityId: activity._id,
        message: `${req.user.name} gave you kudos on "${activity.title}".`,
      });
    }

    res.json({ kudod: true, kudosCount: count });
  } catch (err) {
    next(err);
  }
}

export async function getKudosList(req, res, next) {
  try {
    const activityId = req.params.activityId;
    const kudos = await Kudos.find({ activity: activityId })
      .populate('user', 'name username avatarUrl city country')
      .sort({ createdAt: -1 });

    res.json({ kudos: kudos.map((k) => k.user) });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const activityId = req.params.activityId;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    const hasAccess = await canViewActivity(activity, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const comment = await Comment.create({
      activity: activityId,
      user: req.user._id,
      text: text.trim(),
    });

    const count = await Comment.countDocuments({ activity: activityId });
    activity.commentsCount = count;
    await activity.save();

    if (String(activity.user) !== String(req.user._id)) {
      await Notification.create({
        recipient: activity.user,
        sender: req.user._id,
        type: 'comment',
        entityId: activity._id,
        message: `${req.user.name} commented on "${activity.title}".`,
      });
    }

    const populated = await Comment.findById(comment._id).populate(
      'user',
      'name username avatarUrl'
    );

    res.status(201).json({ comment: populated, commentsCount: count });
  } catch (err) {
    next(err);
  }
}

export async function getComments(req, res, next) {
  try {
    const activityId = req.params.activityId;
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    const comments = await Comment.find({ activity: activityId })
      .populate('user', 'name username avatarUrl')
      .sort({ createdAt: 1 });

    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

export async function getFeed(req, res, next) {
  try {
    const { cursor, limit = 20, filter } = req.query; // filter: 'following', 'explore', 'all'
    const pageLimit = Math.min(50, parseInt(limit, 10));

    let candidateUserIds = [];

    if (req.user) {
      if (filter === 'following') {
        const follows = await Follow.find({ follower: req.user._id });
        candidateUserIds = follows.map((f) => f.following);
        candidateUserIds.push(req.user._id); // include own workouts
      } else {
        // all or default: include following + own + public
        const follows = await Follow.find({ follower: req.user._id });
        candidateUserIds = follows.map((f) => f.following);
        candidateUserIds.push(req.user._id);
      }
    }

    const query = {};

    if (cursor) {
      query.startDate = { $lt: new Date(cursor) };
    }

    if (filter === 'following' && req.user) {
      query.user = { $in: candidateUserIds };
      query.visibility = { $in: ['public', 'followers'] };
    } else if (req.user) {
      query.$or = [
        { user: req.user._id }, // own activities (any visibility)
        { user: { $in: candidateUserIds }, visibility: { $in: ['public', 'followers'] } },
        { visibility: 'public' },
      ];
    } else {
      query.visibility = 'public';
    }

    const activities = await Activity.find(query)
      .sort({ startDate: -1 })
      .limit(pageLimit + 1)
      .populate('user', 'name username avatarUrl city country');

    const hasMore = activities.length > pageLimit;
    const items = hasMore ? activities.slice(0, pageLimit) : activities;
    const nextCursor = hasMore ? items[items.length - 1].startDate.toISOString() : null;

    // Fetch user kudos status for current viewer
    let userKudosSet = new Set();
    if (req.user && items.length > 0) {
      const activityIds = items.map((a) => a._id);
      const userKudos = await Kudos.find({
        activity: { $in: activityIds },
        user: req.user._id,
      });
      userKudosSet = new Set(userKudos.map((k) => String(k.activity)));
    }

    const sanitizedItems = items.map((act) => {
      const summary = sanitizeActivitySummary(act, req.user);
      return {
        ...summary,
        hasKudod: userKudosSet.has(String(act._id)),
      };
    });

    res.json({
      activities: sanitizedItems,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
}
