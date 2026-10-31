/**
 * Format distance based on user unit preference
 * @param {number} meters - Distance in meters
 * @param {'metric'|'imperial'} unitPref - Unit preference
 * @returns {{ value: string, unit: string, full: string }}
 */
export function formatDistance(meters, unitPref = 'metric') {
  if (!meters || isNaN(meters)) return { value: '0.00', unit: unitPref === 'imperial' ? 'mi' : 'km', full: `0.00 ${unitPref === 'imperial' ? 'mi' : 'km'}` };

  if (unitPref === 'imperial') {
    const miles = meters / 1609.344;
    const value = miles.toFixed(2);
    return { value, unit: 'mi', full: `${value} mi` };
  }

  const km = meters / 1000;
  const value = km.toFixed(2);
  return { value, unit: 'km', full: `${value} km` };
}

/**
 * Format duration in seconds into human-readable time (e.g. "42m 15s" or "1h 14m 20s")
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';

  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

/**
 * Format pace for running/walking (min/km or min/mi)
 * @param {number} speedMps - Average speed in meters/second
 * @param {'metric'|'imperial'} unitPref - Unit preference
 */
export function formatPace(speedMps, unitPref = 'metric') {
  if (!speedMps || speedMps <= 0.1 || isNaN(speedMps)) {
    return { value: '--:--', unit: unitPref === 'imperial' ? '/mi' : '/km', full: `--:-- ${unitPref === 'imperial' ? '/mi' : '/km'}` };
  }

  let secPerUnit = 1000 / speedMps; // seconds per km
  if (unitPref === 'imperial') {
    secPerUnit = 1609.344 / speedMps; // seconds per mile
  }

  // Cap implausible pace (> 30 min/km)
  if (secPerUnit > 1800) {
    return { value: '>30:00', unit: unitPref === 'imperial' ? '/mi' : '/km', full: `>30:00 ${unitPref === 'imperial' ? '/mi' : '/km'}` };
  }

  const mins = Math.floor(secPerUnit / 60);
  const secs = Math.round(secPerUnit % 60);
  const value = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const unit = unitPref === 'imperial' ? '/mi' : '/km';

  return { value, unit, full: `${value} ${unit}` };
}

/**
 * Format speed for cycling (km/h or mph)
 * @param {number} speedMps - Average speed in meters/second
 * @param {'metric'|'imperial'} unitPref - Unit preference
 */
export function formatSpeed(speedMps, unitPref = 'metric') {
  if (!speedMps || isNaN(speedMps)) {
    return { value: '0.0', unit: unitPref === 'imperial' ? 'mph' : 'km/h', full: `0.0 ${unitPref === 'imperial' ? 'mph' : 'km/h'}` };
  }

  let speedUnit = speedMps * 3.6; // km/h
  if (unitPref === 'imperial') {
    speedUnit = speedMps * 2.23694; // mph
  }

  const value = speedUnit.toFixed(1);
  const unit = unitPref === 'imperial' ? 'mph' : 'km/h';
  return { value, unit, full: `${value} ${unit}` };
}

/**
 * Format elevation in meters or feet
 */
export function formatElevation(meters, unitPref = 'metric') {
  if (!meters || isNaN(meters)) return { value: '0', unit: unitPref === 'imperial' ? 'ft' : 'm', full: `0 ${unitPref === 'imperial' ? 'ft' : 'm'}` };

  if (unitPref === 'imperial') {
    const feet = Math.round(meters * 3.28084);
    return { value: feet.toLocaleString(), unit: 'ft', full: `${feet.toLocaleString()} ft` };
  }

  const m = Math.round(meters);
  return { value: m.toLocaleString(), unit: 'm', full: `${m.toLocaleString()} m` };
}

/**
 * Format date into friendly display (e.g. "Today at 7:15 AM", "Oct 14, 2026")
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();

  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${timeStr}`;
  }

  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }) + ` at ${timeStr}`;
}

/**
 * Standard Google / Mapbox Encoded Polyline Decoder
 * Converts an encoded polyline string into an array of [lat, lng] pairs.
 */
export function decodePolyline(str, precision = 5) {
  if (!str) return [];
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates = [],
    shift = 0,
    result = 0,
    byte = null,
    latitude_change,
    longitude_change,
    factor = Math.pow(10, Number.isInteger(precision) ? precision : 5);

  while (index < str.length) {
    byte = null;
    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude_change = result & 1 ? ~(result >> 1) : result >> 1;

    lat += latitude_change;
    lng += longitude_change;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

/**
 * Client-side Haversine formula
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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

