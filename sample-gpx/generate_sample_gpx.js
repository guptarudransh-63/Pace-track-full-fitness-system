import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to format ISO timestamp
function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000).toISOString();
}

/**
 * Generate a realistic GPX track
 */
function createGpx({ name, sport, points }) {
  const trkpts = points.map(pt => {
    let extensions = '';
    if (pt.hr || pt.cad) {
      extensions = `
        <extensions>
          <gpxtpx:TrackPointExtension xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
            ${pt.hr ? `<gpxtpx:hr>${pt.hr}</gpxtpx:hr>` : ''}
            ${pt.cad ? `<gpxtpx:cad>${pt.cad}</gpxtpx:cad>` : ''}
          </gpxtpx:TrackPointExtension>
        </extensions>`;
    }
    return `      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lng.toFixed(6)}">
        <ele>${pt.ele.toFixed(1)}</ele>
        <time>${pt.time}</time>${extensions}
      </trkpt>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PaceTrack GPS Engine" xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${name}</name>
    <time>${points[0]?.time || new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <type>${sport}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

// 1. Scenic 5k Run: San Francisco Embarcadero Waterfront
// Starting near Ferry Building, heading north along waterfront past Pier 39 towards Fisherman's Wharf and back
function generateWaterfront5kRun() {
  const points = [];
  const startTime = new Date('2026-10-14T06:45:00Z');
  let currentLat = 37.7955;
  let currentLng = -122.3937;
  let currentEle = 4.0;
  let totalTime = 0;
  const numSteps = 520; // ~5.2 km, each step ~10m every 3 seconds (~3.33 m/s = 5:00 min/km pace)

  // Segment 1: Heading NW along The Embarcadero
  for (let i = 0; i < numSteps; i++) {
    const t = i / numSteps;
    // Follow the Embarcadero curve
    if (i < 260) {
      currentLat += 0.000075 + (Math.random() - 0.5) * 0.000008;
      currentLng -= 0.000060 + (Math.random() - 0.5) * 0.000008;
    } else {
      // Turn around and run back along parallel promenade
      currentLat -= 0.000073 + (Math.random() - 0.5) * 0.000008;
      currentLng += 0.000058 + (Math.random() - 0.5) * 0.000008;
    }

    // Small elevation changes & natural noise
    currentEle = 4.0 + Math.sin(i / 30) * 3.5 + (Math.random() - 0.5) * 0.4;
    totalTime += 3; // 3 seconds per sample

    const hr = Math.round(142 + Math.min(i * 0.05, 25) + Math.sin(i / 10) * 4);
    const cad = Math.round(168 + Math.sin(i / 15) * 4);

    points.push({
      lat: currentLat,
      lng: currentLng,
      ele: currentEle,
      time: addSeconds(startTime, totalTime),
      hr,
      cad
    });
  }

  return createGpx({
    name: "Embarcadero Sunrise 5K Tempo Run",
    sport: "run",
    points
  });
}

// 2. Coastal 15k Bike Ride: Marin Headlands Loop
function generateHeadlandsBikeRide() {
  const points = [];
  const startTime = new Date('2026-10-15T09:15:00Z');
  let currentLat = 37.8320;
  let currentLng = -122.4820;
  let currentEle = 45.0;
  let totalTime = 0;
  const numSteps = 800; // ~15 km, cycling speed ~25-35 km/h

  for (let i = 0; i < numSteps; i++) {
    const angle = (i / numSteps) * 2 * Math.PI;
    // Elliptical coastal route
    currentLat = 37.8350 + Math.sin(angle) * 0.035 + (Math.random() - 0.5) * 0.00001;
    currentLng = -122.5000 + Math.cos(angle) * 0.045 + (Math.random() - 0.5) * 0.00001;
    
    // Mountain ridge elevation profile (climb to 240m then descent)
    currentEle = 45.0 + Math.sin(angle) * 120 + (angle > Math.PI ? 60 : 20) + (Math.random() - 0.5) * 0.8;
    totalTime += 2; // sample every 2 seconds

    const hr = Math.round(135 + Math.sin(angle) * 30 + (Math.random() - 0.5) * 4);
    const cad = Math.round(82 + Math.cos(angle) * 8 + (Math.random() - 0.5) * 2);

    points.push({
      lat: currentLat,
      lng: currentLng,
      ele: Math.max(10, currentEle),
      time: addSeconds(startTime, totalTime),
      hr,
      cad
    });
  }

  return createGpx({
    name: "Marin Headlands Coastal Ridge Ride",
    sport: "ride",
    points
  });
}

// 3. City Park Walk with pauses to test moving time vs elapsed time
function generateParkWalkWithPauses() {
  const points = [];
  const startTime = new Date('2026-10-16T17:00:00Z');
  let currentLat = 37.7690;
  let currentLng = -122.4835;
  let currentEle = 65.0;
  let totalTime = 0;

  for (let i = 0; i < 300; i++) {
    // Walk loop in Golden Gate Park
    if (i >= 120 && i <= 150) {
      // 30 steps with ZERO movement (paused at coffee stand or traffic light for 2 minutes)
      totalTime += 4;
      // Coordinates stay virtually stationary
      points.push({
        lat: currentLat + (Math.random() - 0.5) * 0.000002,
        lng: currentLng + (Math.random() - 0.5) * 0.000002,
        ele: currentEle,
        time: addSeconds(startTime, totalTime),
        hr: 92,
        cad: 0
      });
    } else {
      currentLat += 0.000045 + (Math.random() - 0.5) * 0.000005;
      currentLng += 0.000035 + (Math.random() - 0.5) * 0.000005;
      currentEle += (Math.random() - 0.5) * 0.5;
      totalTime += 3;
      points.push({
        lat: currentLat,
        lng: currentLng,
        ele: currentEle,
        time: addSeconds(startTime, totalTime),
        hr: 105,
        cad: 110
      });
    }
  }

  return createGpx({
    name: "Golden Gate Park Evening Walk",
    sport: "walk",
    points
  });
}

const runGpx = generateWaterfront5kRun();
const rideGpx = generateHeadlandsBikeRide();
const walkGpx = generateParkWalkWithPauses();

fs.writeFileSync(path.join(__dirname, 'morning_run_5k.gpx'), runGpx);
fs.writeFileSync(path.join(__dirname, 'coastal_cycling_15k.gpx'), rideGpx);
fs.writeFileSync(path.join(__dirname, 'park_walk_pause.gpx'), walkGpx);

console.log('Sample GPX files generated successfully in sample-gpx/');
