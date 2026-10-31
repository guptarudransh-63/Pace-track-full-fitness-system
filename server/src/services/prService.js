import { PersonalRecord } from '../models/PersonalRecord.js';

const BENCHMARKS = [
  { category: 'fastest_1k', distance: 1000 },
  { category: 'fastest_1mi', distance: 1609.34 },
  { category: 'fastest_5k', distance: 5000 },
  { category: 'fastest_10k', distance: 10000 },
];

/**
 * Calculate best time for a target distance in meters using rolling window
 */
function findBestTimeForDistance(points, targetDistance) {
  if (!points || points.length < 2) return null;

  const totalDist = points[points.length - 1].distFromStart;
  if (totalDist < targetDistance) return null;

  let bestTimeSeconds = Infinity;
  let right = 0;

  for (let left = 0; left < points.length; left++) {
    const startPoint = points[left];
    if (!startPoint.time) continue;

    while (
      right < points.length &&
      points[right].distFromStart - startPoint.distFromStart < targetDistance
    ) {
      right++;
    }

    if (right < points.length) {
      const endPoint = points[right];
      if (endPoint.time) {
        const timeDiff = (new Date(endPoint.time) - new Date(startPoint.time)) / 1000;
        if (timeDiff > 0 && timeDiff < bestTimeSeconds) {
          bestTimeSeconds = timeDiff;
        }
      }
    }
  }

  return bestTimeSeconds !== Infinity ? Math.round(bestTimeSeconds) : null;
}

/**
 * Evaluate and update personal records for a completed activity
 */
export async function updatePersonalRecords(activity, routePoints = []) {
  if (!activity || !activity.user) return [];

  const userId = activity.user;
  const sportType = activity.sportType;
  const newAchievements = [];

  // 1. Longest Distance
  if (activity.metrics.distance > 0) {
    const existing = await PersonalRecord.findOne({
      user: userId,
      sportType,
      category: 'longest_distance',
    });

    if (!existing || activity.metrics.distance > existing.value) {
      await PersonalRecord.findOneAndUpdate(
        { user: userId, sportType, category: 'longest_distance' },
        {
          value: activity.metrics.distance,
          activity: activity._id,
          achievedAt: activity.startDate,
        },
        { upsert: true, new: true }
      );
      newAchievements.push({ category: 'longest_distance', value: activity.metrics.distance });
    }
  }

  // 2. Longest Duration
  if (activity.metrics.movingTime > 0) {
    const existing = await PersonalRecord.findOne({
      user: userId,
      sportType,
      category: 'longest_duration',
    });

    if (!existing || activity.metrics.movingTime > existing.value) {
      await PersonalRecord.findOneAndUpdate(
        { user: userId, sportType, category: 'longest_duration' },
        {
          value: activity.metrics.movingTime,
          activity: activity._id,
          achievedAt: activity.startDate,
        },
        { upsert: true, new: true }
      );
      newAchievements.push({ category: 'longest_duration', value: activity.metrics.movingTime });
    }
  }

  // 3. Max Elevation Gain
  if (activity.metrics.elevationGain > 0) {
    const existing = await PersonalRecord.findOne({
      user: userId,
      sportType,
      category: 'max_elevation_gain',
    });

    if (!existing || activity.metrics.elevationGain > existing.value) {
      await PersonalRecord.findOneAndUpdate(
        { user: userId, sportType, category: 'max_elevation_gain' },
        {
          value: activity.metrics.elevationGain,
          activity: activity._id,
          achievedAt: activity.startDate,
        },
        { upsert: true, new: true }
      );
      newAchievements.push({ category: 'max_elevation_gain', value: activity.metrics.elevationGain });
    }
  }

  // 4. Rolling-window benchmark times for run/walk/ride
  if (routePoints && routePoints.length > 2) {
    for (const b of BENCHMARKS) {
      const bestTime = findBestTimeForDistance(routePoints, b.distance);
      if (bestTime !== null) {
        const existing = await PersonalRecord.findOne({
          user: userId,
          sportType,
          category: b.category,
        });

        if (!existing || bestTime < existing.value) {
          await PersonalRecord.findOneAndUpdate(
            { user: userId, sportType, category: b.category },
            {
              value: bestTime,
              activity: activity._id,
              achievedAt: activity.startDate,
            },
            { upsert: true, new: true }
          );
          newAchievements.push({ category: b.category, value: bestTime });
        }
      }
    }
  }

  return newAchievements;
}
