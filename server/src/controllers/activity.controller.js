import crypto from 'crypto';
import { Activity } from '../models/Activity.js';
import { Route } from '../models/Route.js';
import { User } from '../models/User.js';
import { SegmentEffort } from '../models/SegmentEffort.js';
import { Kudos, Comment, Follow } from '../models/Social.js';
import { PersonalRecord } from '../models/PersonalRecord.js';
import { parseGpxXml, processRoutePoints } from '../services/routeProcessor.js';
import { canViewActivity, sanitizeRouteForViewer, sanitizeActivitySummary } from '../services/privacyService.js';
import { matchActivitySegments } from '../services/segmentMatcher.js';
import { updatePersonalRecords } from '../services/prService.js';

export async function uploadGpx(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No GPX file provided.' });
    }

    const gpxString = req.file.buffer.toString('utf8');
    const fileHash = crypto.createHash('sha256').update(gpxString).digest('hex');

    // Duplicate upload prevention
    const existing = await Activity.findOne({ user: req.user._id, fileHash });
    if (existing) {
      return res.status(409).json({
        error: 'Duplicate activity: This GPX file has already been uploaded.',
        activityId: existing._id,
      });
    }

    const { trackName, sportType: gpxSport, rawPoints } = parseGpxXml(gpxString);

    if (rawPoints.length === 0) {
      return res.status(400).json({ error: 'Uploaded GPX file contains no valid GPS track points.' });
    }

    // Process route points, calculate metrics, splits, elevation gain, moving time
    const processed = processRoutePoints(rawPoints);

    // Determine sport type (from request body override, GPX type, or default to run)
    let sportType = req.body.sportType || gpxSport || 'run';
    if (!['run', 'ride', 'walk', 'hike', 'workout'].includes(sportType)) {
      sportType = 'run';
    }

    const title = req.body.title || trackName || 'Uploaded Activity';
    const description = req.body.description || '';
    const visibility = req.body.visibility || req.user.privacyPreferences?.defaultActivityVisibility || 'public';
    const hideRoute = req.body.hideRoute === 'true' || req.body.hideRoute === true;
    const hideStartFinishRadiusMeters = Number(req.body.hideStartFinishRadiusMeters) || 0;

    const startDate = rawPoints[0].time || new Date();

    const activity = new Activity({
      user: req.user._id,
      title,
      description,
      sportType,
      visibility,
      hideRoute,
      hideStartFinishRadiusMeters,
      isManual: false,
      startDate,
      metrics: processed.metrics,
      summaryPolyline: processed.summaryPolyline,
      bounds: processed.bounds,
      startPoint: { lat: rawPoints[0].lat, lng: rawPoints[0].lng },
      endPoint: {
        lat: rawPoints[rawPoints.length - 1].lat,
        lng: rawPoints[rawPoints.length - 1].lng,
      },
      splits: processed.splits,
      fileHash,
    });

    await activity.save();

    // Store high-resolution route points and GeoJSON LineString in separate Route document
    const route = new Route({
      activity: activity._id,
      user: req.user._id,
      lineString: {
        type: 'LineString',
        coordinates: processed.lineStringCoordinates,
      },
      points: processed.points,
      elevationProfile: processed.elevationProfile,
    });

    await route.save();

    // Geospatial Segment Matching
    const matchedEfforts = await matchActivitySegments(activity, processed.points);

    // Personal Records update
    const achievements = await updatePersonalRecords(activity, processed.points);

    // Update User lifetime stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'stats.totalDistanceMeters': processed.metrics.distance,
        'stats.totalMovingTimeSeconds': processed.metrics.movingTime,
        'stats.totalElevationMeters': processed.metrics.elevationGain,
        'stats.activityCount': 1,
      },
    });

    res.status(201).json({
      activity,
      matchedEffortsCount: matchedEfforts.length,
      achievements,
    });
  } catch (err) {
    next(err);
  }
}

export async function createManualActivity(req, res, next) {
  try {
    const { title, description, sportType, distance, duration, elevationGain, startDate, visibility } = req.body;

    if (!title || !sportType || distance === undefined || duration === undefined) {
      return res.status(400).json({ error: 'Title, sportType, distance, and duration are required.' });
    }

    const distMeters = Math.max(0, Number(distance));
    const durSeconds = Math.max(1, Number(duration));
    const eleGain = Math.max(0, Number(elevationGain) || 0);
    const avgSpeed = Math.round((distMeters / durSeconds) * 100) / 100;
    const calories = Math.round((distMeters / 1000) * 65);

    const activity = new Activity({
      user: req.user._id,
      title,
      description: description || '',
      sportType,
      visibility: visibility || req.user.privacyPreferences?.defaultActivityVisibility || 'public',
      isManual: true,
      startDate: startDate ? new Date(startDate) : new Date(),
      metrics: {
        distance: distMeters,
        elapsedTime: durSeconds,
        movingTime: durSeconds,
        averageSpeed: avgSpeed,
        maxSpeed: avgSpeed,
        elevationGain: eleGain,
        elevationLoss: 0,
        calories,
      },
    });

    await activity.save();

    const achievements = await updatePersonalRecords(activity, []);

    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'stats.totalDistanceMeters': distMeters,
        'stats.totalMovingTimeSeconds': durSeconds,
        'stats.totalElevationMeters': eleGain,
        'stats.activityCount': 1,
      },
    });

    res.status(201).json({ activity, achievements });
  } catch (err) {
    next(err);
  }
}

export async function getActivityById(req, res, next) {
  try {
    const activity = await Activity.findById(req.params.id).populate('user', 'name username avatarUrl city country');

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    const hasAccess = await canViewActivity(activity, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this activity.' });
    }

    // Check if current user has kudos'd this activity
    let hasKudod = false;
    if (req.user) {
      const kudo = await Kudos.findOne({ activity: activity._id, user: req.user._id });
      hasKudod = !!kudo;
    }

    const sanitized = sanitizeActivitySummary(activity, req.user);

    res.json({
      activity: {
        ...sanitized,
        hasKudod,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getActivityRoute(req, res, next) {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    const hasAccess = await canViewActivity(activity, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this activity route.' });
    }

    const route = await Route.findOne({ activity: activity._id });
    if (!route) {
      return res.json({ points: [], elevationProfile: [], summaryPolyline: '' });
    }

    const owner = await User.findById(activity.user);

    // CRUCIAL: Server-side privacy filtering of route coordinates
    const sanitizedRoute = sanitizeRouteForViewer(route, activity, req.user, owner);

    res.json(sanitizedRoute);
  } catch (err) {
    next(err);
  }
}

export async function getActivitySplits(req, res, next) {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    const hasAccess = await canViewActivity(activity, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    res.json({ splits: activity.splits || [] });
  } catch (err) {
    next(err);
  }
}

export async function getActivitySegments(req, res, next) {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    const hasAccess = await canViewActivity(activity, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const efforts = await SegmentEffort.find({ activity: activity._id })
      .populate('segment', 'name distance elevationDiff sportType polyline')
      .sort({ startDate: 1 });

    res.json({ efforts });
  } catch (err) {
    next(err);
  }
}

export async function updateActivity(req, res, next) {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    if (String(activity.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only edit your own activities.' });
    }

    const allowedFields = [
      'title',
      'description',
      'sportType',
      'visibility',
      'hideRoute',
      'hideStartFinishRadiusMeters',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        activity[field] = req.body[field];
      }
    }

    await activity.save();
    await activity.populate('user', 'name username avatarUrl city country');
    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

export async function deleteActivity(req, res, next) {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    if (String(activity.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only delete your own activities.' });
    }

    // Decrement user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'stats.totalDistanceMeters': -activity.metrics.distance,
        'stats.totalMovingTimeSeconds': -activity.metrics.movingTime,
        'stats.totalElevationMeters': -activity.metrics.elevationGain,
        'stats.activityCount': -1,
      },
    });

    // Clean up dependent resources
    await Route.deleteMany({ activity: activity._id });
    await SegmentEffort.deleteMany({ activity: activity._id });
    await PersonalRecord.deleteMany({ activity: activity._id });
    await Kudos.deleteMany({ activity: activity._id });
    await Comment.deleteMany({ activity: activity._id });
    await Activity.findByIdAndDelete(activity._id);

    res.json({ message: 'Activity deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function getUserActivities(req, res, next) {
  try {
    const targetUserId = req.params.userId;
    const isOwner = req.user && String(req.user._id) === String(targetUserId);

    let isFollowing = false;
    if (!isOwner && req.user) {
      const follow = await Follow.findOne({
        follower: req.user._id,
        following: targetUserId,
      });
      isFollowing = !!follow;
    }

    const query = { user: targetUserId };
    if (!isOwner) {
      query.visibility = isFollowing ? { $in: ['public', 'followers'] } : 'public';
    }

    const activities = await Activity.find(query)
      .sort({ startDate: -1 })
      .limit(30)
      .populate('user', 'name username avatarUrl');

    const sanitized = activities.map((act) => sanitizeActivitySummary(act, req.user));

    res.json({ activities: sanitized });
  } catch (err) {
    next(err);
  }
}
