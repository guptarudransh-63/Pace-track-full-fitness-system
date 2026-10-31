import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  parseGpxXml,
  processRoutePoints,
} from '../services/routeProcessor.js';

describe('Route Processing & Geospatial Math', () => {
  it('calculates accurate Haversine distance between known coordinates', () => {
    // Distance between Eiffel Tower (48.8584, 2.2945) and Arc de Triomphe (48.8738, 2.2950) is ~1.71 km
    const dist = haversineDistance(48.8584, 2.2945, 48.8738, 2.295);
    expect(dist).toBeGreaterThan(1650);
    expect(dist).toBeLessThan(1750);
  });

  it('safely handles zero distance between identical points', () => {
    const dist = haversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    expect(dist).toBe(0);
  });

  it('parses valid GPX XML structure correctly', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" creator="Test">
      <trk>
        <name>Test Run</name>
        <type>run</type>
        <trkseg>
          <trkpt lat="37.7749" lon="-122.4194">
            <ele>15.0</ele>
            <time>2026-10-14T06:00:00Z</time>
          </trkpt>
          <trkpt lat="37.7750" lon="-122.4195">
            <ele>16.2</ele>
            <time>2026-10-14T06:00:05Z</time>
          </trkpt>
        </trkseg>
      </trk>
    </gpx>`;

    const { trackName, sportType, rawPoints } = parseGpxXml(xml);
    expect(trackName).toBe('Test Run');
    expect(sportType).toBe('run');
    expect(rawPoints.length).toBe(2);
    expect(rawPoints[0].lat).toBeCloseTo(37.7749);
    expect(rawPoints[0].ele).toBe(15.0);
    expect(rawPoints[0].time).toBeInstanceOf(Date);
  });

  it('filters out invalid latitude and longitude ranges', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1">
      <trk><trkseg>
        <trkpt lat="95.0" lon="-122.4194"><time>2026-10-14T06:00:00Z</time></trkpt>
        <trkpt lat="37.7749" lon="-195.0"><time>2026-10-14T06:00:02Z</time></trkpt>
        <trkpt lat="37.7749" lon="-122.4194"><time>2026-10-14T06:00:04Z</time></trkpt>
      </trkseg></trk>
    </gpx>`;

    const { rawPoints } = parseGpxXml(xml);
    expect(rawPoints.length).toBe(1);
    expect(rawPoints[0].lat).toBe(37.7749);
  });

  it('correctly detects pauses and separates moving time from elapsed time', () => {
    // Athlete runs for 100 seconds, stops at a red light for 200 seconds, then runs for 100 seconds
    const points = [
      { lat: 37.770, lng: -122.420, ele: 10, time: new Date('2026-10-14T07:00:00Z') },
      { lat: 37.773, lng: -122.420, ele: 10, time: new Date('2026-10-14T07:01:40Z') }, // moved ~333m in 100s (~3.3 m/s)
      { lat: 37.773, lng: -122.420, ele: 10, time: new Date('2026-10-14T07:05:00Z') }, // paused stationary for 200s
      { lat: 37.776, lng: -122.420, ele: 10, time: new Date('2026-10-14T07:06:40Z') }, // moved another ~333m in 100s
    ];

    const result = processRoutePoints(points);
    expect(result.metrics.elapsedTime).toBe(400); // 400 seconds total elapsed
    expect(result.metrics.movingTime).toBe(200); // exactly 200 seconds moving time!
    expect(result.metrics.distance).toBeGreaterThan(600);
  });

  it('filters elevation jitter noise using deadband threshold', () => {
    // Standing on flat ground with GPS noise flickering between 10.0m and 10.5m
    const points = [];
    const baseTime = new Date('2026-10-14T08:00:00Z');
    for (let i = 0; i < 20; i++) {
      points.push({
        lat: 37.770 + i * 0.0001,
        lng: -122.420,
        ele: 10.0 + (i % 2 === 0 ? 0.6 : -0.6), // +/- 0.6m noise
        time: new Date(baseTime.getTime() + i * 3000),
      });
    }

    const result = processRoutePoints(points);
    // Flat run with +/-0.6m noise should not accumulate 12m of elevation gain
    expect(result.metrics.elevationGain).toBe(0);
  });

  it('produces kilometer splits for long activities', () => {
    // Generate a 2.5 km route
    const points = [];
    const baseTime = new Date('2026-10-14T09:00:00Z');
    const totalPoints = 250;
    for (let i = 0; i <= totalPoints; i++) {
      points.push({
        lat: 37.770 + (i / totalPoints) * 0.0225, // ~2.5 km
        lng: -122.420,
        ele: 20 + i * 0.1,
        time: new Date(baseTime.getTime() + i * 3000),
      });
    }

    const result = processRoutePoints(points);
    expect(result.metrics.distance).toBeGreaterThan(2400);
    expect(result.splits.length).toBeGreaterThanOrEqual(2);
    expect(result.splits[0].splitNumber).toBe(1);
    expect(result.splits[0].distance).toBeGreaterThanOrEqual(1000);
  });

  it('handles empty or zero-point inputs safely without crashing', () => {
    const emptyResult = processRoutePoints([]);
    expect(emptyResult.metrics.distance).toBe(0);
    expect(emptyResult.metrics.movingTime).toBe(0);
    expect(emptyResult.splits).toEqual([]);
    expect(emptyResult.summaryPolyline).toBe('');
  });
});
