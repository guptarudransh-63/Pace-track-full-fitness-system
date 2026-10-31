import polyline from '@mapbox/polyline';
import { haversineDistance } from './routeProcessor.js';
import { Follow } from '../models/Social.js';

/**
 * Determine if a viewer has permission to view an activity
 * @param {Object} activity - The activity document
 * @param {Object|null} viewerUser - The authenticated user or null if anonymous
 * @returns {Promise<boolean>}
 */
export async function canViewActivity(activity, viewerUser) {
  if (!activity) return false;

  const isOwner = viewerUser && String(activity.user._id || activity.user) === String(viewerUser._id);
  if (isOwner) return true;

  if (activity.visibility === 'public') {
    return true;
  }

  if (activity.visibility === 'private') {
    return false; // only owner can view private activities
  }

  if (activity.visibility === 'followers') {
    if (!viewerUser) return false;
    const follow = await Follow.findOne({
      follower: viewerUser._id,
      following: activity.user._id || activity.user,
    });
    return !!follow;
  }

  return false;
}

/**
 * Filter route coordinates to enforce privacy rules server-side.
 * Trims points falling inside start/finish radius or user home privacy zone.
 * @param {Object} routeDoc - Route document or points array
 * @param {Object} activity - Associated activity
 * @param {Object|null} viewerUser - Authenticated requesting user
 * @param {Object|null} activityOwner - User owner of activity with privacy preferences
 * @returns {Object} Sanitized route data (points, polyline, lineString)
 */
export function sanitizeRouteForViewer(routeDoc, activity, viewerUser, activityOwner = null) {
  if (!routeDoc || !activity) {
    return { points: [], elevationProfile: [], summaryPolyline: '', isPrivacyFiltered: false };
  }

  const isOwner = viewerUser && String(activity.user._id || activity.user) === String(viewerUser._id);

  // Owners can always view their full unmodified route
  if (isOwner) {
    const pts = routeDoc.points || [];
    return {
      points: pts,
      elevationProfile: routeDoc.elevationProfile || [],
      summaryPolyline: activity.summaryPolyline || '',
      isPrivacyFiltered: false,
    };
  }

  // 1. If entire route is hidden for non-owners
  if (activity.hideRoute) {
    return {
      points: [],
      elevationProfile: [],
      summaryPolyline: '',
      isPrivacyFiltered: true,
      reason: 'route_hidden',
    };
  }

  const rawPoints = routeDoc.points || [];
  if (rawPoints.length === 0) {
    return { points: [], elevationProfile: [], summaryPolyline: '', isPrivacyFiltered: false };
  }

  // 2. Determine privacy buffer centers and radiuses
  const privacyZones = [];

  // Start & finish buffer
  const startFinishRadius = activity.hideStartFinishRadiusMeters || 0;
  if (startFinishRadius > 0 && rawPoints.length > 0) {
    const startPt = rawPoints[0];
    const endPt = rawPoints[rawPoints.length - 1];
    privacyZones.push({ lat: startPt.lat, lng: startPt.lng, radius: startFinishRadius });
    privacyZones.push({ lat: endPt.lat, lng: endPt.lng, radius: startFinishRadius });
  }

  // User home privacy zone
  if (
    activityOwner?.privacyPreferences?.hideHomeRadiusMeters > 0 &&
    activityOwner.privacyPreferences.homeLatitude !== null &&
    activityOwner.privacyPreferences.homeLongitude !== null
  ) {
    privacyZones.push({
      lat: activityOwner.privacyPreferences.homeLatitude,
      lng: activityOwner.privacyPreferences.homeLongitude,
      radius: activityOwner.privacyPreferences.hideHomeRadiusMeters,
    });
  }

  // If no privacy zones are active, return standard route
  if (privacyZones.length === 0) {
    return {
      points: rawPoints,
      elevationProfile: routeDoc.elevationProfile || [],
      summaryPolyline: activity.summaryPolyline || '',
      isPrivacyFiltered: false,
    };
  }

  // 3. Filter out any points falling within any privacy zone
  const safePoints = rawPoints.filter((pt) => {
    for (const zone of privacyZones) {
      const dist = haversineDistance(pt.lat, pt.lng, zone.lat, zone.lng);
      if (dist < zone.radius) {
        return false; // Point is within restricted zone -> Exclude!
      }
    }
    return true;
  });

  // Re-encode sanitized polyline so frontend map never sees redacted coordinates
  const safeLatLngPairs = safePoints.map((p) => [p.lat, p.lng]);
  const safePolyline = safeLatLngPairs.length > 0 ? polyline.encode(safeLatLngPairs) : '';

  // Filter elevation profile to only safe distances if points exist
  return {
    points: safePoints,
    elevationProfile: routeDoc.elevationProfile || [],
    summaryPolyline: safePolyline,
    isPrivacyFiltered: true,
  };
}

/**
 * Sanitize an activity object for feed or list views
 */
export function sanitizeActivitySummary(activity, viewerUser) {
  const isOwner = viewerUser && String(activity.user._id || activity.user) === String(viewerUser._id);
  const plain = activity.toObject ? activity.toObject() : { ...activity };

  if (!isOwner) {
    if (plain.hideRoute) {
      plain.summaryPolyline = '';
      plain.startPoint = null;
      plain.endPoint = null;
      plain.bounds = { minLat: null, minLng: null, maxLat: null, maxLng: null };
    } else if (plain.hideStartFinishRadiusMeters > 0) {
      // Don't leak exact start/end pins
      plain.startPoint = null;
      plain.endPoint = null;
    }
  }

  return plain;
}
