import { Activity } from '../models/Activity.js';
import { Goal } from '../models/Goal.js';
import { PersonalRecord } from '../models/PersonalRecord.js';

/**
 * Get comprehensive analytics for a user
 */
export async function getUserAnalytics(userId, options = {}) {
  const days = options.days || 30;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  // Fetch all user activities in the time window
  const activities = await Activity.find({
    user: userId,
    startDate: { $gte: sinceDate },
  }).sort({ startDate: 1 });

  // Lifetime aggregates
  const allActivities = await Activity.find({ user: userId });
  let totalDistance = 0;
  let totalMovingTime = 0;
  let totalElevation = 0;
  const sportCounts = {};

  for (const act of allActivities) {
    totalDistance += act.metrics.distance || 0;
    totalMovingTime += act.metrics.movingTime || 0;
    totalElevation += act.metrics.elevationGain || 0;
    sportCounts[act.sportType] = (sportCounts[act.sportType] || 0) + 1;
  }

  // Daily time series for charts
  const dailyMap = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = {
      date: key,
      distanceMeters: 0,
      movingTimeSeconds: 0,
      elevationGainMeters: 0,
      activityCount: 0,
    };
  }

  for (const act of activities) {
    const key = act.startDate.toISOString().split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].distanceMeters += act.metrics.distance || 0;
      dailyMap[key].movingTimeSeconds += act.metrics.movingTime || 0;
      dailyMap[key].elevationGainMeters += act.metrics.elevationGain || 0;
      dailyMap[key].activityCount += 1;
    }
  }

  const dailyTrend = Object.values(dailyMap);

  // Weekly summary (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyActivities = activities.filter((a) => a.startDate >= oneWeekAgo);

  const weeklySummary = {
    distanceMeters: weeklyActivities.reduce((acc, a) => acc + (a.metrics.distance || 0), 0),
    movingTimeSeconds: weeklyActivities.reduce((acc, a) => acc + (a.metrics.movingTime || 0), 0),
    elevationGainMeters: weeklyActivities.reduce((acc, a) => acc + (a.metrics.elevationGain || 0), 0),
    activityCount: weeklyActivities.length,
  };

  // Sport distribution array for donut chart
  const sportDistribution = Object.entries(sportCounts).map(([sport, count]) => ({
    sport,
    count,
  }));

  // Personal Records
  const records = await PersonalRecord.find({ user: userId }).populate('activity', 'title startDate metrics');

  return {
    lifetime: {
      totalDistanceMeters: totalDistance,
      totalMovingTimeSeconds: totalMovingTime,
      totalElevationMeters: totalElevation,
      totalActivities: allActivities.length,
    },
    weeklySummary,
    dailyTrend,
    sportDistribution,
    personalRecords: records,
  };
}

/**
 * Calculate dynamic progress for a training goal
 */
export async function calculateGoalProgress(goal) {
  const query = {
    user: goal.user,
    startDate: { $gte: goal.startDate, $lte: goal.endDate },
  };

  if (goal.sportType !== 'all') {
    query.sportType = goal.sportType;
  }

  const activities = await Activity.find(query);

  let currentValue = 0;
  for (const act of activities) {
    if (goal.metricType === 'distance') {
      currentValue += act.metrics.distance || 0;
    } else if (goal.metricType === 'time') {
      currentValue += act.metrics.movingTime || 0;
    } else if (goal.metricType === 'elevation') {
      currentValue += act.metrics.elevationGain || 0;
    } else if (goal.metricType === 'activities_count') {
      currentValue += 1;
    }
  }

  const percentage =
    goal.targetValue > 0
      ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
      : 0;
  const isCompleted = currentValue >= goal.targetValue;

  return {
    ...goal.toObject(),
    currentValue,
    percentage,
    isCompleted,
  };
}
