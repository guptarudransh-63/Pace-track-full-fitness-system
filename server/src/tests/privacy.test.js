import { describe, it, expect } from 'vitest';
import {
  canViewActivity,
  sanitizeRouteForViewer,
  sanitizeActivitySummary,
} from '../services/privacyService.js';
import { haversineDistance } from '../services/routeProcessor.js';

describe('Activity & Location Privacy Engine', () => {
  const ownerId = '650000000000000000000001';
  const strangerId = '650000000000000000000002';

  const mockOwner = { _id: ownerId, name: 'Alice Runner' };
  const mockStranger = { _id: strangerId, name: 'Bob Viewer' };

  it('allows anyone to view public activities', async () => {
    const activity = { user: ownerId, visibility: 'public' };
    const canStrangerView = await canViewActivity(activity, mockStranger);
    const canAnonView = await canViewActivity(activity, null);

    expect(canStrangerView).toBe(true);
    expect(canAnonView).toBe(true);
  });

  it('strictly blocks non-owners from viewing private activities', async () => {
    const activity = { user: ownerId, visibility: 'private' };
    const canStrangerView = await canViewActivity(activity, mockStranger);
    const canAnonView = await canViewActivity(activity, null);
    const canOwnerView = await canViewActivity(activity, mockOwner);

    expect(canStrangerView).toBe(false);
    expect(canAnonView).toBe(false);
    expect(canOwnerView).toBe(true);
  });

  it('completely hides route coordinates when hideRoute is enabled for non-owners', () => {
    const activity = {
      user: ownerId,
      visibility: 'public',
      hideRoute: true,
      summaryPolyline: 'encoded_secret_route',
    };

    const routeDoc = {
      points: [
        { lat: 37.77, lng: -122.42, ele: 10 },
        { lat: 37.78, lng: -122.43, ele: 12 },
      ],
      elevationProfile: [{ distance: 0, elevation: 10 }],
    };

    // Non-owner view
    const sanitized = sanitizeRouteForViewer(routeDoc, activity, mockStranger);
    expect(sanitized.points).toEqual([]);
    expect(sanitized.summaryPolyline).toBe('');
    expect(sanitized.isPrivacyFiltered).toBe(true);

    // Owner view maintains full route
    const ownerView = sanitizeRouteForViewer(routeDoc, activity, mockOwner);
    expect(ownerView.points.length).toBe(2);
    expect(ownerView.summaryPolyline).toBe('encoded_secret_route');
    expect(ownerView.isPrivacyFiltered).toBe(false);
  });

  it('filters out coordinates within start/finish privacy buffer (e.g. 500m)', () => {
    const startLat = 37.7700;
    const startLng = -122.4200;

    // Generate 10 points spaced ~100m apart along latitude (total 1 km)
    const points = [];
    for (let i = 0; i < 10; i++) {
      points.push({
        lat: startLat + i * 0.0009, // ~100m steps
        lng: startLng,
        ele: 20,
        distFromStart: i * 100,
      });
    }

    const activity = {
      user: ownerId,
      visibility: 'public',
      hideRoute: false,
      hideStartFinishRadiusMeters: 350, // 350m privacy buffer around start & finish
      summaryPolyline: 'full_polyline',
    };

    const routeDoc = { points, elevationProfile: [] };

    const sanitized = sanitizeRouteForViewer(routeDoc, activity, mockStranger);
    expect(sanitized.isPrivacyFiltered).toBe(true);

    // Verify NO point in sanitized.points is within 350m of start
    for (const pt of sanitized.points) {
      const distFromStart = haversineDistance(pt.lat, pt.lng, startLat, startLng);
      expect(distFromStart).toBeGreaterThanOrEqual(350);
    }

    // Verify points count is reduced
    expect(sanitized.points.length).toBeLessThan(points.length);
  });

  it('redacts startPoint and endPoint from public feed summary when privacy buffer is active', () => {
    const activity = {
      user: ownerId,
      visibility: 'public',
      hideStartFinishRadiusMeters: 500,
      startPoint: { lat: 37.77, lng: -122.42 },
      endPoint: { lat: 37.78, lng: -122.43 },
      title: 'Secret Home Run',
    };

    const sanitized = sanitizeActivitySummary(activity, mockStranger);
    expect(sanitized.startPoint).toBeNull();
    expect(sanitized.endPoint).toBeNull();

    // Owner sees original start/end
    const ownerSummary = sanitizeActivitySummary(activity, mockOwner);
    expect(ownerSummary.startPoint).toEqual({ lat: 37.77, lng: -122.42 });
  });
});
