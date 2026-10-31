import { XMLParser } from 'fast-xml-parser';
import polyline from '@mapbox/polyline';

/**
 * Calculate distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parse raw GPX XML string into raw points array
 */
export function parseGpxXml(gpxString) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseNodeValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  const parsed = parser.parse(gpxString);
  if (!parsed || !parsed.gpx) {
    throw new Error('Invalid GPX: Missing root <gpx> element');
  }

  const gpx = parsed.gpx;
  const trackName = gpx.trk?.name || gpx.metadata?.name || 'Imported Activity';
  const sportType = (gpx.trk?.type || '').toLowerCase();

  let trksegs = gpx.trk?.trkseg;
  if (!trksegs) {
    // Sometimes waypoints or routes are used, but trk/trkseg is canonical
    if (gpx.rte?.rtept) {
      trksegs = [{ trkpt: gpx.rte.rtept }];
    } else {
      return { trackName, sportType, rawPoints: [] };
    }
  }

  if (!Array.isArray(trksegs)) {
    trksegs = [trksegs];
  }

  const rawPoints = [];

  for (const seg of trksegs) {
    let pts = seg.trkpt;
    if (!pts) continue;
    if (!Array.isArray(pts)) {
      pts = [pts];
    }

    for (const pt of pts) {
      const lat = parseFloat(pt['@_lat']);
      const lng = parseFloat(pt['@_lon']);

      // Coordinate boundary validation
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        continue;
      }

      let time = null;
      if (pt.time) {
        const parsedTime = new Date(pt.time);
        if (!isNaN(parsedTime.getTime())) {
          time = parsedTime;
        }
      }

      const ele = pt.ele !== undefined && !isNaN(parseFloat(pt.ele)) ? parseFloat(pt.ele) : null;

      // Extract sensor extensions (Garmin TrackPointExtension)
      let hr = null;
      let cad = null;

      const ext = pt.extensions;
      if (ext) {
        const tpx = ext['gpxtpx:TrackPointExtension'] || ext.TrackPointExtension;
        if (tpx) {
          if (tpx['gpxtpx:hr'] !== undefined) hr = parseInt(tpx['gpxtpx:hr'], 10);
          else if (tpx.hr !== undefined) hr = parseInt(tpx.hr, 10);

          if (tpx['gpxtpx:cad'] !== undefined) cad = parseInt(tpx['gpxtpx:cad'], 10);
          else if (tpx.cad !== undefined) cad = parseInt(tpx.cad, 10);
        }
      }

      rawPoints.push({ lat, lng, ele, time, hr, cad });
    }
  }

  return { trackName, sportType, rawPoints };
}

/**
 * Comprehensive GPS Route Processor
 * Filters noise, computes metrics, splits, elevation gain, moving time, bounds and polyline.
 */
export function processRoutePoints(rawPoints, options = {}) {
  if (!rawPoints || rawPoints.length === 0) {
    return {
      points: [],
      bounds: { minLat: null, minLng: null, maxLat: null, maxLng: null },
      elevationProfile: [],
      splits: [],
      summaryPolyline: '',
      lineStringCoordinates: [],
      metrics: {
        distance: 0,
        elapsedTime: 0,
        movingTime: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
        averageHeartRate: null,
        maxHeartRate: null,
        averageCadence: null,
        calories: 0,
      },
    };
  }

  // 1. Sort points by timestamp if present
  const sortedPoints = [...rawPoints].filter(
    (p) => p && !isNaN(p.lat) && !isNaN(p.lng) && p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180
  );

  const hasTimestamps = sortedPoints.some((p) => p.time instanceof Date);
  if (hasTimestamps) {
    sortedPoints.sort((a, b) => {
      const ta = a.time ? a.time.getTime() : 0;
      const tb = b.time ? b.time.getTime() : 0;
      return ta - tb;
    });
  }

  // 2. Filter duplicate points and implausible GPS jumps
  const cleanedPoints = [];
  const MAX_SPEED_THRESHOLD_MPS = 50; // 180 km/h is max reasonable threshold for human endurance sports
  const MIN_MOVING_SPEED_MPS = 0.5; // < 0.5 m/s (1.8 km/h) is considered paused/stopped

  let totalDistance = 0;
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;

  let totalHr = 0,
    hrCount = 0,
    maxHr = 0;
  let totalCad = 0,
    cadCount = 0;
  let maxSpeed = 0;

  let prevPoint = null;

  for (let i = 0; i < sortedPoints.length; i++) {
    const pt = sortedPoints[i];

    if (prevPoint) {
      // Check for exact coordinate duplicate: only skip if timestamps are also identical or under 1s
      if (Math.abs(pt.lat - prevPoint.lat) < 1e-7 && Math.abs(pt.lng - prevPoint.lng) < 1e-7) {
        const timeDiff = pt.time && prevPoint.time ? Math.abs(pt.time.getTime() - prevPoint.time.getTime()) / 1000 : 0;
        if (timeDiff < 1) {
          continue;
        }
      }

      const dist = haversineDistance(prevPoint.lat, prevPoint.lng, pt.lat, pt.lng);

      if (pt.time && prevPoint.time) {
        const timeDiffSec = (pt.time.getTime() - prevPoint.time.getTime()) / 1000;
        if (timeDiffSec > 0) {
          const speed = dist / timeDiffSec;
          // Discard implausible GPS teleport jumps
          if (speed > MAX_SPEED_THRESHOLD_MPS && dist > 100) {
            continue;
          }
        }
      }

      totalDistance += dist;
    }

    minLat = Math.min(minLat, pt.lat);
    maxLat = Math.max(maxLat, pt.lat);
    minLng = Math.min(minLng, pt.lng);
    maxLng = Math.max(maxLng, pt.lng);

    if (pt.hr && !isNaN(pt.hr) && pt.hr > 30 && pt.hr < 250) {
      totalHr += pt.hr;
      hrCount++;
      maxHr = Math.max(maxHr, pt.hr);
    }

    if (pt.cad && !isNaN(pt.cad) && pt.cad > 0 && pt.cad < 250) {
      totalCad += pt.cad;
      cadCount++;
    }

    cleanedPoints.push({
      ...pt,
      distFromStart: Math.round(totalDistance * 10) / 10,
    });

    prevPoint = pt;
  }

  if (cleanedPoints.length === 0) {
    return processRoutePoints([]);
  }

  // 3. Compute Elapsed Time and Moving Time
  let elapsedTime = 0;
  let movingTime = 0;

  if (hasTimestamps && cleanedPoints.length > 1) {
    const firstTime = cleanedPoints[0].time?.getTime() || 0;
    const lastTime = cleanedPoints[cleanedPoints.length - 1].time?.getTime() || 0;
    elapsedTime = Math.max(0, Math.round((lastTime - firstTime) / 1000));

    // Calculate moving time between consecutive segments
    for (let i = 1; i < cleanedPoints.length; i++) {
      const p1 = cleanedPoints[i - 1];
      const p2 = cleanedPoints[i];

      if (p1.time && p2.time) {
        const dt = (p2.time.getTime() - p1.time.getTime()) / 1000;
        const ds = p2.distFromStart - p1.distFromStart;

        if (dt > 0) {
          const instantSpeed = ds / dt;
          if (instantSpeed >= MIN_MOVING_SPEED_MPS && instantSpeed <= MAX_SPEED_THRESHOLD_MPS) {
            movingTime += dt;
            maxSpeed = Math.max(maxSpeed, instantSpeed);
          }
        }
      }
    }
    movingTime = Math.round(movingTime);
    // If moving time is 0 or unmeasurable, fall back to elapsed time
    if (movingTime === 0) {
      movingTime = elapsedTime;
    }
  } else {
    // If no timestamps, default elapsed and moving time from options or estimate 3 m/s (~10.8 km/h)
    movingTime = options.durationSeconds || Math.round(totalDistance / 3.0);
    elapsedTime = movingTime;
  }

  // 4. Elevation gain/loss with deadband filtering (ignores noise fluctuations < 2m)
  let elevationGain = 0;
  let elevationLoss = 0;
  const ELEVATION_NOISE_THRESHOLD = 2.0; // 2 meters threshold

  let prevEle = null;
  let accumulatedEleChange = 0;

  for (const pt of cleanedPoints) {
    if (pt.ele !== null && pt.ele !== undefined) {
      if (prevEle !== null) {
        const dEle = pt.ele - prevEle;
        accumulatedEleChange += dEle;

        if (accumulatedEleChange >= ELEVATION_NOISE_THRESHOLD) {
          elevationGain += accumulatedEleChange;
          accumulatedEleChange = 0;
        } else if (accumulatedEleChange <= -ELEVATION_NOISE_THRESHOLD) {
          elevationLoss += Math.abs(accumulatedEleChange);
          accumulatedEleChange = 0;
        }
      }
      prevEle = pt.ele;
    }
  }

  // 5. Generate Distance-based Splits (1,000m / 1 km splits)
  const splits = [];
  const SPLIT_INTERVAL_METERS = 1000;
  let currentSplitIndex = 1;
  let splitStartDist = 0;
  let splitStartTime = cleanedPoints[0]?.time?.getTime() || 0;
  let splitStartEle = cleanedPoints[0]?.ele || 0;

  for (let i = 1; i < cleanedPoints.length; i++) {
    const pt = cleanedPoints[i];
    const distInSplit = pt.distFromStart - splitStartDist;

    if (distInSplit >= SPLIT_INTERVAL_METERS || i === cleanedPoints.length - 1) {
      const splitDist = Math.max(1, distInSplit);
      const ptTime = pt.time ? pt.time.getTime() : splitStartTime;
      const splitElapsed = Math.max(1, Math.round((ptTime - splitStartTime) / 1000));
      const splitSpeed = splitDist / splitElapsed;
      const splitEleChange = pt.ele !== null ? Math.round((pt.ele - splitStartEle) * 10) / 10 : 0;

      splits.push({
        splitNumber: currentSplitIndex++,
        distance: Math.round(splitDist),
        elapsedTime: splitElapsed,
        movingTime: splitElapsed,
        averageSpeed: Math.round(splitSpeed * 100) / 100,
        elevationChange: splitEleChange,
      });

      splitStartDist = pt.distFromStart;
      splitStartTime = ptTime;
      splitStartEle = pt.ele !== null ? pt.ele : splitStartEle;
    }
  }

  // 6. Elevation Profile for synchronized chart rendering (sample ~100 points)
  const step = Math.max(1, Math.floor(cleanedPoints.length / 100));
  const elevationProfile = [];
  for (let i = 0; i < cleanedPoints.length; i += step) {
    const pt = cleanedPoints[i];
    elevationProfile.push({
      distance: Math.round(pt.distFromStart),
      elevation: pt.ele !== null ? Math.round(pt.ele * 10) / 10 : 0,
    });
  }

  // 7. Polyline encoding & GeoJSON coordinates
  const latLngPairs = cleanedPoints.map((p) => [p.lat, p.lng]);
  const summaryPolyline = polyline.encode(latLngPairs);
  const lineStringCoordinates = cleanedPoints.map((p) => [p.lng, p.lat]); // GeoJSON is [lng, lat]

  // 8. Overall average speed & calories estimate
  const effectiveTime = movingTime > 0 ? movingTime : elapsedTime > 0 ? elapsedTime : 1;
  const averageSpeed = totalDistance > 0 ? Math.round((totalDistance / effectiveTime) * 100) / 100 : 0;
  // Estimate ~65 kcal per km for 70kg runner/rider base
  const calories = Math.round((totalDistance / 1000) * 65);

  return {
    points: cleanedPoints,
    bounds: {
      minLat: minLat !== Infinity ? minLat : null,
      minLng: minLng !== Infinity ? minLng : null,
      maxLat: maxLat !== -Infinity ? maxLat : null,
      maxLng: maxLng !== -Infinity ? maxLng : null,
    },
    elevationProfile,
    splits,
    summaryPolyline,
    lineStringCoordinates,
    metrics: {
      distance: Math.round(totalDistance),
      elapsedTime,
      movingTime,
      averageSpeed,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      elevationGain: Math.round(elevationGain),
      elevationLoss: Math.round(elevationLoss),
      averageHeartRate: hrCount > 0 ? Math.round(totalHr / hrCount) : null,
      maxHeartRate: maxHr > 0 ? maxHr : null,
      averageCadence: cadCount > 0 ? Math.round(totalCad / cadCount) : null,
      calories,
    },
  };
}
