import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Kudos, Comment, Follow } from '../models/Social.js';
import { Goal } from '../models/Goal.js';
import { Activity } from '../models/Activity.js';
import { calculateGoalProgress } from '../services/analyticsService.js';

describe('Social Interactions & Training Goals Engine', () => {
  beforeAll(async () => {
    await connectDB();
    await Kudos.syncIndexes();
  });

  afterAll(async () => {
    await disconnectDB(true);
  });

  it('enforces kudos deduplication via unique compound index', async () => {
    const activityId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    await Kudos.create({ activity: activityId, user: userId });

    // Attempt duplicate kudos
    let duplicateError = null;
    try {
      await Kudos.create({ activity: activityId, user: userId });
    } catch (err) {
      duplicateError = err;
    }

    expect(duplicateError).not.toBeNull();
    expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
  });

  it('calculates dynamic training goal progress from stored activities', async () => {
    const userId = new mongoose.Types.ObjectId();
    const now = new Date();
    const weekStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    // Create a 20 km weekly running goal
    const goal = await Goal.create({
      user: userId,
      sportType: 'run',
      metricType: 'distance',
      targetValue: 20000, // 20 km in meters
      period: 'weekly',
      startDate: weekStart,
      endDate: weekEnd,
    });

    // Add two 6 km runs
    await Activity.create({
      user: userId,
      title: 'Tempo Tuesday',
      sportType: 'run',
      startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      metrics: { distance: 6000, movingTime: 1800, averageSpeed: 3.33 },
    });

    await Activity.create({
      user: userId,
      title: 'Easy Thursday',
      sportType: 'run',
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      metrics: { distance: 6000, movingTime: 1800, averageSpeed: 3.33 },
    });

    // Add a bike ride (should NOT count towards running goal)
    await Activity.create({
      user: userId,
      title: 'Recovery Ride',
      sportType: 'ride',
      startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      metrics: { distance: 15000, movingTime: 2400, averageSpeed: 6.25 },
    });

    const evaluated = await calculateGoalProgress(goal);

    expect(evaluated.currentValue).toBe(12000); // 12 km completed
    expect(evaluated.percentage).toBe(60); // 12 / 20 = 60%
    expect(evaluated.isCompleted).toBe(false);
  });
});
