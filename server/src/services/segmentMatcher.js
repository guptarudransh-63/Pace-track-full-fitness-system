import { Segment } from '../models/Segment.js';
import { SegmentEffort } from '../models/SegmentEffort.js';
import { haversineDistance } from './routeProcessor.js';

const START_END_TOLERANCE_METERS = 50; // max 50m distance from segment start/finish
const DISTANCE_TOLERANCE_RATIO = 0.20; // within 20% distance variation

/**
 * Find candidate segments and match efforts for an activity route
 * @param {Object} activity - The Activity document
 * @param {Array} routePoints - Array of route points { lat, lng, time, ele, distFromStart }
 */
export async function matchActivitySegments(activity, routePoints) {
  if (!activity || !routePoints || routePoints.length < 2) {
    return [];
  }

  // 1. Find candidate segments for this sport type
  const candidateSegments = await Segment.find({
    sportType: activity.sportType,
  });

  if (candidateSegments.length === 0) {
    return [];
  }

  const matchedEfforts = [];

  for (const segment of candidateSegments) {
    const segStartLng = segment.startPoint.coordinates[0];
    const segStartLat = segment.startPoint.coordinates[1];
    const segEndLng = segment.endPoint.coordinates[0];
    const segEndLat = segment.endPoint.coordinates[1];

    let bestStartIndex = -1;
    let minStartDist = Infinity;

    // Find closest route point to segment start
    for (let i = 0; i < routePoints.length - 1; i++) {
      const d = haversineDistance(routePoints[i].lat, routePoints[i].lng, segStartLat, segStartLng);
      if (d < START_END_TOLERANCE_METERS && d < minStartDist) {
        minStartDist = d;
        bestStartIndex = i;
      }
    }

    if (bestStartIndex === -1) continue;

    // Find closest route point to segment end AFTER bestStartIndex
    let bestEndIndex = -1;
    let minEndDist = Infinity;

    for (let j = bestStartIndex + 1; j < routePoints.length; j++) {
      const d = haversineDistance(routePoints[j].lat, routePoints[j].lng, segEndLat, segEndLng);
      if (d < START_END_TOLERANCE_METERS && d < minEndDist) {
        minEndDist = d;
        bestEndIndex = j;
      }
    }

    if (bestEndIndex === -1) continue;

    const ptStart = routePoints[bestStartIndex];
    const ptEnd = routePoints[bestEndIndex];

    const effortDistance = ptEnd.distFromStart - ptStart.distFromStart;
    const distanceDelta = Math.abs(effortDistance - segment.distance);

    // Verify distance is within tolerance
    if (distanceDelta > segment.distance * DISTANCE_TOLERANCE_RATIO) {
      continue;
    }

    // Calculate elapsed time from timestamps
    let elapsedTime = 0;
    if (ptStart.time && ptEnd.time) {
      elapsedTime = Math.max(1, Math.round((new Date(ptEnd.time) - new Date(ptStart.time)) / 1000));
    } else {
      elapsedTime = Math.max(1, Math.round(effortDistance / (activity.metrics.averageSpeed || 3.0)));
    }

    const movingTime = elapsedTime;
    const avgSpeed = Math.round((effortDistance / elapsedTime) * 100) / 100;

    // Check if effort already exists for this activity & segment
    let effort = await SegmentEffort.findOne({
      activity: activity._id,
      segment: segment._id,
    });

    const isNew = !effort;
    if (isNew) {
      effort = new SegmentEffort({
        activity: activity._id,
        segment: segment._id,
        user: activity.user,
        sportType: activity.sportType,
        elapsedTime,
        movingTime,
        startDate: ptStart.time || activity.startDate,
        avgSpeed,
      });
    } else {
      effort.elapsedTime = elapsedTime;
      effort.movingTime = movingTime;
      effort.avgSpeed = avgSpeed;
    }

    // Check user's previous best effort on this segment
    const previousBest = await SegmentEffort.findOne({
      segment: segment._id,
      user: activity.user,
      _id: { $ne: effort._id },
    }).sort({ elapsedTime: 1 });

    if (!previousBest || elapsedTime < previousBest.elapsedTime) {
      effort.isPersonalRecord = true;
    }

    await effort.save();

    // Increment effort and athlete counts if new
    if (isNew) {
      await Segment.findByIdAndUpdate(segment._id, {
        $inc: { effortCount: 1 },
      });
      const distinctUsers = await SegmentEffort.distinct('user', { segment: segment._id });
      await Segment.findByIdAndUpdate(segment._id, {
        athleteCount: distinctUsers.length,
      });
    }

    matchedEfforts.push(effort);
  }

  // Recalculate leaderboard rankings for all matched segments
  for (const effort of matchedEfforts) {
    await updateSegmentLeaderboardRanks(effort.segment);
  }

  return matchedEfforts;
}

/**
 * Recalculate rank for efforts on a segment
 */
export async function updateSegmentLeaderboardRanks(segmentId) {
  const allEfforts = await SegmentEffort.find({ segment: segmentId }).sort({ elapsedTime: 1, startDate: 1 });
  for (let rank = 0; rank < allEfforts.length; rank++) {
    allEfforts[rank].rank = rank + 1;
    await allEfforts[rank].save();
  }
}
