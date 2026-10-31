import polyline from '@mapbox/polyline';
import { Segment } from '../models/Segment.js';
import { SegmentEffort } from '../models/SegmentEffort.js';
import { Route } from '../models/Route.js';
import { Activity } from '../models/Activity.js';
import { Follow } from '../models/Social.js';
import { haversineDistance } from '../services/routeProcessor.js';
import { matchActivitySegments } from '../services/segmentMatcher.js';

export async function createSegment(req, res, next) {
  try {
    const { activityId, name, description, startIndex, endIndex } = req.body;

    if (!activityId || !name || startIndex === undefined || endIndex === undefined) {
      return res.status(400).json({ error: 'activityId, name, startIndex, and endIndex are required.' });
    }

    if (endIndex <= startIndex) {
      return res.status(400).json({ error: 'endIndex must be greater than startIndex.' });
    }

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    const route = await Route.findOne({ activity: activityId });
    if (!route || !route.points || route.points.length <= endIndex) {
      return res.status(400).json({ error: 'Invalid route points range.' });
    }

    const subPoints = route.points.slice(startIndex, endIndex + 1);
    const startPt = subPoints[0];
    const endPt = subPoints[subPoints.length - 1];

    let distance = 0;
    for (let i = 1; i < subPoints.length; i++) {
      distance += haversineDistance(
        subPoints[i - 1].lat,
        subPoints[i - 1].lng,
        subPoints[i].lat,
        subPoints[i].lng
      );
    }

    const elevationDiff =
      endPt.ele !== null && startPt.ele !== null
        ? Math.round((endPt.ele - startPt.ele) * 10) / 10
        : 0;

    const latLngPairs = subPoints.map((p) => [p.lat, p.lng]);
    const encodedPoly = polyline.encode(latLngPairs);
    const lineStringCoordinates = subPoints.map((p) => [p.lng, p.lat]);

    const segment = new Segment({
      name,
      description: description || '',
      sportType: activity.sportType,
      distance: Math.round(distance),
      elevationDiff,
      startPoint: {
        type: 'Point',
        coordinates: [startPt.lng, startPt.lat],
      },
      endPoint: {
        type: 'Point',
        coordinates: [endPt.lng, endPt.lat],
      },
      lineString: {
        type: 'LineString',
        coordinates: lineStringCoordinates,
      },
      polyline: encodedPoly,
      creator: req.user._id,
    });

    await segment.save();

    // Auto-match segment against recent eligible activities
    const eligibleActivities = await Activity.find({
      sportType: segment.sportType,
    }).limit(50);

    for (const act of eligibleActivities) {
      const actRoute = await Route.findOne({ activity: act._id });
      if (actRoute) {
        await matchActivitySegments(act, actRoute.points);
      }
    }

    res.status(201).json({ segment });
  } catch (err) {
    next(err);
  }
}

export async function getSegments(req, res, next) {
  try {
    const { sportType, lat, lng, radiusKm, search } = req.query;
    const query = {};

    if (sportType && sportType !== 'all') {
      query.sportType = sportType;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (lat && lng) {
      const rad = Number(radiusKm) || 25;
      query.startPoint = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: rad * 1000,
        },
      };
    }

    const segments = await Segment.find(query)
      .sort({ effortCount: -1 })
      .limit(50)
      .populate('creator', 'name username');

    res.json({ segments });
  } catch (err) {
    next(err);
  }
}

export async function getSegmentById(req, res, next) {
  try {
    const segment = await Segment.findById(req.params.id).populate('creator', 'name username');
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found.' });
    }
    res.json({ segment });
  } catch (err) {
    next(err);
  }
}

export async function getSegmentLeaderboard(req, res, next) {
  try {
    const { id } = req.params;
    const { filter } = req.query; // 'all', 'following', 'me'

    const segment = await Segment.findById(id);
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found.' });
    }

    const query = { segment: id };

    if (filter === 'me' && req.user) {
      query.user = req.user._id;
    } else if (filter === 'following' && req.user) {
      const follows = await Follow.find({ follower: req.user._id });
      const followingIds = follows.map((f) => f.following);
      followingIds.push(req.user._id);
      query.user = { $in: followingIds };
    }

    // Get best effort per user to avoid one person filling the top 10
    const efforts = await SegmentEffort.aggregate([
      { $match: { segment: segment._id, ...(query.user ? { user: query.user } : {}) } },
      { $sort: { elapsedTime: 1, startDate: 1 } },
      {
        $group: {
          _id: '$user',
          effortId: { $first: '$_id' },
          activityId: { $first: '$activity' },
          elapsedTime: { $first: '$elapsedTime' },
          movingTime: { $first: '$movingTime' },
          avgSpeed: { $first: '$avgSpeed' },
          startDate: { $first: '$startDate' },
        },
      },
      { $sort: { elapsedTime: 1 } },
      { $limit: 25 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: '$effortId',
          activityId: 1,
          elapsedTime: 1,
          movingTime: 1,
          avgSpeed: 1,
          startDate: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            username: '$user.username',
            avatarUrl: '$user.avatarUrl',
            city: '$user.city',
            country: '$user.country',
          },
        },
      },
    ]);

    // Attach leaderboards ranks
    const rankedLeaderboard = efforts.map((eff, index) => ({
      ...eff,
      rank: index + 1,
    }));

    res.json({ leaderboard: rankedLeaderboard });
  } catch (err) {
    next(err);
  }
}
