import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Activity } from '../models/Activity.js';
import { Route } from '../models/Route.js';
import { Segment } from '../models/Segment.js';
import { Club, ClubMember } from '../models/Club.js';
import { Goal } from '../models/Goal.js';
import { Follow, Kudos, Comment, Notification } from '../models/Social.js';
import { parseGpxXml, processRoutePoints } from '../services/routeProcessor.js';
import { matchActivitySegments } from '../services/segmentMatcher.js';
import { updatePersonalRecords } from '../services/prService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleGpxDir = path.resolve(__dirname, '../../../sample-gpx');

export async function seedDatabase(disconnectAtEnd = true) {
  console.log('--- Seeding PaceTrack Database ---');
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Activity.deleteMany({}),
    Route.deleteMany({}),
    Segment.deleteMany({}),
    Club.deleteMany({}),
    ClubMember.deleteMany({}),
    Goal.deleteMany({}),
    Follow.deleteMany({}),
    Kudos.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log('Cleared existing data.');

  // 1. Create Demo Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      name: 'Alex Rivera',
      username: 'alex_runner',
      email: 'alex@pacetrack.dev',
      passwordHash,
      bio: 'Marathon runner & endurance enthusiast. Training for Sub-3h marathon.',
      city: 'San Francisco, CA',
      country: 'United States',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      unitPreference: 'metric',
      privacyPreferences: {
        defaultActivityVisibility: 'public',
        hideHomeRadiusMeters: 500,
        homeLatitude: 37.7955,
        homeLongitude: -122.3937,
      },
    },
    {
      name: 'Sarah Chen',
      username: 'sarah_cyclist',
      email: 'sarah@pacetrack.dev',
      passwordHash,
      bio: 'Road cyclist & hill climber. Chasing PRs across the Bay Area ridges.',
      city: 'Sausalito, CA',
      country: 'United States',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      unitPreference: 'imperial',
      privacyPreferences: {
        defaultActivityVisibility: 'public',
        hideHomeRadiusMeters: 0,
      },
    },
    {
      name: 'Marcus Vance',
      username: 'marcus_pacer',
      email: 'marcus@pacetrack.dev',
      passwordHash,
      bio: 'Track and trail runner. 5K/10K speed specialist.',
      city: 'Oakland, CA',
      country: 'United States',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      unitPreference: 'metric',
      privacyPreferences: {
        defaultActivityVisibility: 'public',
      },
    },
    {
      name: 'Elena Rostova',
      username: 'elena_triathlete',
      email: 'elena@pacetrack.dev',
      passwordHash,
      bio: 'Triathlete & trail explorer. Love early morning sunrise sessions.',
      city: 'Berkeley, CA',
      country: 'United States',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      unitPreference: 'metric',
      privacyPreferences: {
        defaultActivityVisibility: 'public',
      },
    },
  ];

  const createdUsers = await User.create(usersData);
  const [alex, sarah, marcus, elena] = createdUsers;
  console.log(`Created ${createdUsers.length} athletes.`);

  // 2. Establish Social Follows
  await Follow.create([
    { follower: alex._id, following: sarah._id },
    { follower: alex._id, following: marcus._id },
    { follower: sarah._id, following: alex._id },
    { follower: sarah._id, following: elena._id },
    { follower: marcus._id, following: alex._id },
    { follower: elena._id, following: alex._id },
  ]);

  // 3. Create Clubs
  const enduranceClub = await Club.create({
    name: 'Bay Area Endurance Collective',
    description: 'Premier training group for marathon runners, cyclists, and multisport athletes across the Bay.',
    sportType: 'all',
    city: 'San Francisco, CA',
    country: 'United States',
    avatar: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=150&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    owner: alex._id,
    memberCount: 4,
  });

  const veloClub = await Club.create({
    name: 'Marin Alpine Velo',
    description: 'High-cadence road cycling through coastal peaks, Headlands, and Mt. Tamalpais.',
    sportType: 'ride',
    city: 'Sausalito, CA',
    country: 'United States',
    avatar: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=150&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&auto=format&fit=crop&q=80',
    owner: sarah._id,
    memberCount: 2,
  });

  await ClubMember.create([
    { club: enduranceClub._id, user: alex._id, role: 'owner' },
    { club: enduranceClub._id, user: sarah._id, role: 'admin' },
    { club: enduranceClub._id, user: marcus._id, role: 'member' },
    { club: enduranceClub._id, user: elena._id, role: 'member' },
    { club: veloClub._id, user: sarah._id, role: 'owner' },
    { club: veloClub._id, user: alex._id, role: 'member' },
  ]);

  console.log('Created 2 fitness clubs and member rosters.');

  // 4. Create Segments
  const embarcaderoSegment = await Segment.create({
    name: 'Embarcadero Waterfront Mile Sprint',
    description: 'Fast and flat pavement stretch along the bay with iconic views.',
    sportType: 'run',
    distance: 1250,
    elevationDiff: 1.5,
    startPoint: { type: 'Point', coordinates: [-122.3955, 37.7970] },
    endPoint: { type: 'Point', coordinates: [-122.4045, 37.8075] },
    lineString: {
      type: 'LineString',
      coordinates: [
        [-122.3955, 37.7970],
        [-122.4000, 37.8020],
        [-122.4045, 37.8075],
      ],
    },
    polyline: 'w|heF`fgjV_@l@yAdBwBhCo@x@',
    creator: alex._id,
  });

  const headlandsClimbSegment = await Segment.create({
    name: 'Hawk Hill Coastal Ascent',
    description: 'Classic Marin cycling climb with sweeping ocean winds and steep gradient.',
    sportType: 'ride',
    distance: 2800,
    elevationDiff: 145.0,
    startPoint: { type: 'Point', coordinates: [-122.4850, 37.8300] },
    endPoint: { type: 'Point', coordinates: [-122.5050, 37.8450] },
    lineString: {
      type: 'LineString',
      coordinates: [
        [-122.4850, 37.8300],
        [-122.4950, 37.8380],
        [-122.5050, 37.8450],
      ],
    },
    polyline: 'm|peFp}mjV{CuDaEwFiDwEqB_C',
    creator: sarah._id,
  });

  console.log('Created 2 popular segments.');

  // 5. Ingest Real Sample GPX Activities
  const gpxFiles = [
    {
      file: 'morning_run_5k.gpx',
      user: alex,
      title: 'Embarcadero Sunrise 5K Tempo Run',
      description: 'Chilly morning tempo pace along the piers. Felt strong in the closing mile.',
      sportType: 'run',
      visibility: 'public',
      hideStartFinishRadiusMeters: 500, // Demonstrates start/finish privacy protection!
      daysAgo: 1, // Yesterday
    },
    {
      file: 'coastal_cycling_15k.gpx',
      user: sarah,
      title: 'Marin Headlands Coastal Ridge Ride',
      description: 'Crisp morning air and great climbing cadence. Tested high gears on descent.',
      sportType: 'ride',
      visibility: 'public',
      hideStartFinishRadiusMeters: 0,
      daysAgo: 2, // 2 days ago
    },
    {
      file: 'park_walk_pause.gpx',
      user: marcus,
      title: 'Golden Gate Park Evening Walk',
      description: 'Active recovery walk with a stop at the tea garden.',
      sportType: 'walk',
      visibility: 'public',
      hideStartFinishRadiusMeters: 0,
      daysAgo: 3, // 3 days ago
    },
  ];

  const createdActivities = [];

  for (const item of gpxFiles) {
    const filePath = path.join(sampleGpxDir, item.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}, skipping...`);
      continue;
    }

    const xmlContent = fs.readFileSync(filePath, 'utf8');
    const { rawPoints } = parseGpxXml(xmlContent);

    // Shift timestamps so activities are within the current week and month
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - (item.daysAgo || 1));
    targetDate.setHours(7, 30, 0, 0);

    const timeOffset = rawPoints[0]?.time
      ? targetDate.getTime() - rawPoints[0].time.getTime()
      : 0;

    for (const pt of rawPoints) {
      if (pt.time) {
        pt.time = new Date(pt.time.getTime() + timeOffset);
      }
    }

    const processed = processRoutePoints(rawPoints);

    const act = new Activity({
      user: item.user._id,
      title: item.title,
      description: item.description,
      sportType: item.sportType,
      visibility: item.visibility,
      hideRoute: false,
      hideStartFinishRadiusMeters: item.hideStartFinishRadiusMeters,
      isManual: false,
      isDemo: true, // Clearly marks sample workouts
      startDate: rawPoints[0]?.time || new Date(),
      metrics: processed.metrics,
      summaryPolyline: processed.summaryPolyline,
      bounds: processed.bounds,
      startPoint: { lat: rawPoints[0].lat, lng: rawPoints[0].lng },
      endPoint: {
        lat: rawPoints[rawPoints.length - 1].lat,
        lng: rawPoints[rawPoints.length - 1].lng,
      },
      splits: processed.splits,
    });

    await act.save();

    const route = new Route({
      activity: act._id,
      user: item.user._id,
      lineString: {
        type: 'LineString',
        coordinates: processed.lineStringCoordinates,
      },
      points: processed.points,
      elevationProfile: processed.elevationProfile,
    });

    await route.save();

    // Match segments & update PRs
    await matchActivitySegments(act, processed.points);
    await updatePersonalRecords(act, processed.points);

    // Update user stats
    await User.findByIdAndUpdate(item.user._id, {
      $inc: {
        'stats.totalDistanceMeters': processed.metrics.distance,
        'stats.totalMovingTimeSeconds': processed.metrics.movingTime,
        'stats.totalElevationMeters': processed.metrics.elevationGain,
        'stats.activityCount': 1,
      },
    });

    createdActivities.push(act);
    console.log(`Ingested GPX activity: "${act.title}" (${(processed.metrics.distance / 1000).toFixed(2)} km)`);
  }

  // 6. Add Social Interactions (Kudos & Comments)
  if (createdActivities.length >= 2) {
    const [alexRun, sarahRide] = createdActivities;

    // Kudos
    await Kudos.create([
      { activity: alexRun._id, user: sarah._id },
      { activity: alexRun._id, user: marcus._id },
      { activity: alexRun._id, user: elena._id },
      { activity: sarahRide._id, user: alex._id },
      { activity: sarahRide._id, user: elena._id },
    ]);

    alexRun.kudosCount = 3;
    await alexRun.save();

    sarahRide.kudosCount = 2;
    await sarahRide.save();

    // Comments
    await Comment.create([
      {
        activity: alexRun._id,
        user: sarah._id,
        text: 'Awesome pace on that final stretch, Alex! Looking prime for race day 🏃🔥',
      },
      {
        activity: alexRun._id,
        user: marcus._id,
        text: 'Solid splits! That 4th km was blazing fast.',
      },
      {
        activity: sarahRide._id,
        user: alex._id,
        text: 'Great climb Sarah! Those Hawk Hill switchbacks are no joke 🚴⛰️',
      },
    ]);

    alexRun.commentsCount = 2;
    await alexRun.save();

    sarahRide.commentsCount = 1;
    await sarahRide.save();

    // Notifications for Alex
    await Notification.create([
      {
        recipient: alex._id,
        sender: sarah._id,
        type: 'kudos',
        entityId: alexRun._id,
        message: `${sarah.name} gave you kudos on "${alexRun.title}".`,
      },
      {
        recipient: alex._id,
        sender: marcus._id,
        type: 'comment',
        entityId: alexRun._id,
        message: `${marcus.name} commented on "${alexRun.title}".`,
      },
      {
        recipient: alex._id,
        sender: elena._id,
        type: 'follow',
        message: `${elena.name} started following you.`,
      },
    ]);
  }

  // 7. Create Training Goals
  const now = new Date();
  const startOfPeriod = new Date(now);
  startOfPeriod.setDate(startOfPeriod.getDate() - 7);
  startOfPeriod.setHours(0, 0, 0, 0);

  const endOfPeriod = new Date(now);
  endOfPeriod.setDate(endOfPeriod.getDate() + 23);

  await Goal.create([
    {
      user: alex._id,
      sportType: 'run',
      metricType: 'distance',
      targetValue: 25000, // 25 km running goal
      period: 'monthly',
      startDate: startOfPeriod,
      endDate: endOfPeriod,
    },
    {
      user: sarah._id,
      sportType: 'ride',
      metricType: 'distance',
      targetValue: 50000, // 50 km cycling goal
      period: 'monthly',
      startDate: startOfPeriod,
      endDate: endOfPeriod,
    },
    {
      user: alex._id,
      sportType: 'all',
      metricType: 'activities_count',
      targetValue: 5,
      period: 'monthly',
      startDate: startOfPeriod,
      endDate: endOfPeriod,
    },
  ]);

  console.log('Created training goals.');
  console.log('--- PaceTrack Database Seed Complete ---');
  if (disconnectAtEnd) {
    await disconnectDB(true);
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase(true).catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
}

