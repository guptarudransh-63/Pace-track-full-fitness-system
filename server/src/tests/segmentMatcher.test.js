import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Segment } from '../models/Segment.js';
import { matchActivitySegments } from '../services/segmentMatcher.js';
import { SegmentEffort } from '../models/SegmentEffort.js';

describe('Geospatial Segment Engine', () => {
  let db;

  beforeAll(async () => {
    db = await connectDB();
  });

  afterAll(async () => {
    await disconnectDB(true);
  });

  it('matches route points to candidate segment in forward direction', async () => {
    const creatorId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const activityId = new mongoose.Types.ObjectId();

    // Create a 1km segment along lat: 37.800 to 37.809
    const segment = await Segment.create({
      name: 'Embarcadero Mile Sprint',
      sportType: 'run',
      distance: 1000,
      startPoint: { type: 'Point', coordinates: [-122.400, 37.800] },
      endPoint: { type: 'Point', coordinates: [-122.400, 37.809] },
      lineString: {
        type: 'LineString',
        coordinates: [
          [-122.400, 37.800],
          [-122.400, 37.809],
        ],
      },
      polyline: 'mock_poly',
      creator: creatorId,
    });

    // Generate an activity route that passes through this segment
    const startTime = new Date('2026-10-14T06:00:00Z');
    const routePoints = [
      { lat: 37.795, lng: -122.400, ele: 5, distFromStart: 0, time: new Date(startTime.getTime()) },
      { lat: 37.800, lng: -122.400, ele: 5, distFromStart: 555, time: new Date(startTime.getTime() + 150000) }, // Segment start
      { lat: 37.805, lng: -122.400, ele: 6, distFromStart: 1110, time: new Date(startTime.getTime() + 300000) },
      { lat: 37.809, lng: -122.400, ele: 6, distFromStart: 1555, time: new Date(startTime.getTime() + 420000) }, // Segment finish (1000m effort in 270s)
      { lat: 37.815, lng: -122.400, ele: 7, distFromStart: 2220, time: new Date(startTime.getTime() + 600000) },
    ];

    const activity = {
      _id: activityId,
      user: userId,
      sportType: 'run',
      startDate: startTime,
      metrics: { averageSpeed: 3.7 },
    };

    const matched = await matchActivitySegments(activity, routePoints);
    expect(matched.length).toBe(1);
    expect(String(matched[0].segment)).toBe(String(segment._id));
    expect(matched[0].elapsedTime).toBe(270); // 420 - 150 = 270 seconds
  });

  it('rejects route running in opposite direction of segment', async () => {
    const activityId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    // Route moving in reverse (southbound: 37.815 down to 37.795)
    const startTime = new Date('2026-10-14T07:00:00Z');
    const reverseRoutePoints = [
      { lat: 37.815, lng: -122.400, ele: 7, distFromStart: 0, time: new Date(startTime.getTime()) },
      { lat: 37.809, lng: -122.400, ele: 6, distFromStart: 665, time: new Date(startTime.getTime() + 180000) }, // Passes end point FIRST
      { lat: 37.800, lng: -122.400, ele: 5, distFromStart: 1665, time: new Date(startTime.getTime() + 450000) }, // Passes start point SECOND
    ];

    const activity = {
      _id: activityId,
      user: userId,
      sportType: 'run',
      startDate: startTime,
      metrics: { averageSpeed: 3.7 },
    };

    const matched = await matchActivitySegments(activity, reverseRoutePoints);
    // Reverse movement should not match a forward-only segment
    expect(matched.length).toBe(0);
  });
});
