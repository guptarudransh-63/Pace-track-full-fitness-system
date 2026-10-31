# PaceTrack — Full-Stack Fitness Tracking & Social Platform

**PaceTrack** is an athlete-first, full-stack fitness tracking and social platform inspired by Strava. Built with a modern, high-performance stack, it features authentic GPS activity ingestion, high-precision geospatial route processing, interactive Leaflet maps with synchronized elevation charts, route segment matching with course record leaderboards, weekly training analytics, social feeds with kudos and comments, fitness clubs, and server-side location privacy.

---

## Architecture Overview

```
                                      ┌─────────────────────────────────────┐
                                      │         React 18 + Vite             │
                                      │  (Tailwind CSS, Leaflet, Recharts)  │
                                      └──────────────────┬──────────────────┘
                                                         │ HTTP + Cookies / WSS
                                                         ▼
                                      ┌─────────────────────────────────────┐
                                      │        Express.js Server            │
                                      │   (REST API v1 + Socket.IO Server)  │
                                      └──────┬───────────┬───────────┬──────┘
                                             │           │           │
                 ┌───────────────────────────┴──┐        │           └──────────────────────────┐
                 ▼                              ▼        ▼                                      ▼
    ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
    │  Route Processing Engine │   │  Geospatial Matcher      │   │  Privacy Shield Filter   │
    │  - Haversine Distance    │   │  - 2dsphere Proximity    │   │  - Start/Finish Buffers  │
    │  - Moving Time vs Pauses │   │  - Chronological Match   │   │  - Home Radius Masking   │
    │  - Deadband Elev Filter  │   │  - Segment Leaderboards  │   │  - Coordinate Redaction  │
    │  - 1km & 1mi Splits      │   │  - Personal Records PRs  │   │  - Server-side Filter    │
    └──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘
                                                │
                                                ▼
                                   ┌──────────────────────────┐
                                   │     MongoDB Database     │
                                   │ (2dsphere Spatial Index) │
                                   └──────────────────────────┘
```

---

## Key Features

1. **GPS Route Processing Engine**:
   - Parses standard GPX 1.1 tracks, elevations, timestamps, and sensor telemetry (heart rate, cadence).
   - Validates coordinates and chronological order; filters GPS teleport jumps (>180 km/h).
   - Separates **moving time** from **elapsed time** using instant speed thresholds (`< 0.5 m/s` detected as stationary pause).
   - Elevation deadband noise reduction (`< 2m` noise fluctuations discarded to prevent inflated elevation gain).
   - Computes distance-based kilometer splits with interval pace and elevation deltas.
   - Generates compact Google-encoded polylines and bounding boxes for fast map previews.

2. **Interactive GPS Maps**:
   - Leaflet map rendering with CartoDB Voyager tiles.
   - Start (Green) and Finish (Chequered) custom SVG markers.
   - Synchronized Elevation Profile chart: hovering on the elevation profile immediately renders an animated pulse pin at the exact corresponding GPS position on the map!

3. **Geospatial Route Segments & Leaderboards**:
   - Create segments from any workout route geometry.
   - Candidate segments detected using MongoDB 2dsphere spatial index.
   - Chronological route matcher with tolerance corridors (~50m start/end proximity, directional validation, and distance tolerance).
   - Course record leaderboards (Rank 1 👑 Crown, All Athletes, Following, Personal Best).

4. **Training Analytics & Goals**:
   - Interactive charts: Daily distance bar chart, cumulative moving duration area chart, and sport distribution breakdown.
   - Personal Records trophy showcase: Fastest 1k, 1mi, 5k, 10k, longest distance, longest duration, max climb.
   - Training Goals: Dynamic progress tracking from actual stored user workouts.

5. **Server-Side Location & Route Privacy**:
   - Visibility settings: Public, Followers Only, Private.
   - Configurable start/finish privacy buffer (e.g. 500m) and user home coordinate privacy zones.
   - **Crucial Security Standard**: Coordinates falling within privacy zones are redacted **server-side** in API serializers. Unauthorized clients never receive raw coordinates in JSON payloads.

6. **Fitness Clubs & Social Feed**:
   - Create clubs, join/leave, manage club roles (owner, admin, member).
   - Weekly club distance and duration leaderboards.
   - Social feed with cursor pagination, kudos (likes) with compound unique deduplication, and discussion comments.

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Leaflet & React Leaflet, Recharts, Zustand, TanStack Query, Lucide React.
- **Backend**: Node.js, Express.js (ES modules), MongoDB + Mongoose, JWT in HttpOnly cookies, Zod, fast-xml-parser, Socket.IO.
- **Testing**: Vitest, Supertest, MongoDB In-Memory Server.

---

## Getting Started

### 1. Prerequisites
- Node.js >= 18
- MongoDB (or the built-in automatic In-Memory MongoDB server)

### 2. Installation
Install all root, server, and client dependencies:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 3. Seed Database with Realistic Demo Data
PaceTrack includes authentic GPX tracks for runs and coastal cycling loops:
```bash
npm run seed
```
*(Note: If the database is empty, the server also auto-seeds on first launch!)*

**Pre-seeded Demo Athletes**:
- **Alex Rivera** (`alex_runner` / `password123`) — Marathoner with 5K Embarcadero Waterfront Run
- **Sarah Chen** (`sarah_cyclist` / `password123`) — Road Cyclist with 15K Marin Headlands Ride
- **Marcus Vance** (`marcus_pacer` / `password123`) — 5K/10K Speed Specialist
- **Elena Rostova** (`elena_triathlete` / `password123`) — Triathlete

### 4. Running Development Servers
Run backend and frontend concurrently:
```bash
npm run dev
```
Or run individually:
- Backend: `cd server && npm run dev` (Runs on `http://localhost:5001`)
- Frontend: `cd client && npm run dev` (Runs on `http://localhost:5173`)

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Automated Tests

Run backend unit and integration test suites:
```bash
cd server
npm test
```
**Test Suites**:
- `routeProcessor.test.js`: Validates Haversine distance, GPX XML parsing, coordinate sanity checks, moving time pause separation, elevation deadband filtering, and 1km splits.
- `privacy.test.js`: Verifies public vs followers vs private visibility rules and server-side coordinate redaction within privacy buffers.
- `segmentMatcher.test.js`: Verifies geospatial segment detection, directional movement validation, and leaderboard ranking.
- `socialAndGoals.test.js`: Verifies kudos deduplication via compound unique index and dynamic goal progress calculation.

---

## REST API Specification

### Authentication (`/api/v1/auth`)
- `POST /register`: Create athlete profile
- `POST /login`: Authenticate and set HttpOnly session cookie
- `POST /logout`: Clear session cookie
- `GET /me`: Get current authenticated user
- `PATCH /profile`: Update name, bio, city, country, avatar
- `PATCH /preferences`: Update unit system (metric/imperial) and privacy defaults

### Activities (`/api/v1/activities`)
- `POST /upload`: Upload GPX file (`multipart/form-data`)
- `POST /manual`: Log manual workout without GPS
- `GET /:id`: Retrieve activity metadata and summary metrics
- `GET /:id/route`: Retrieve privacy-sanitized route coordinates and elevation profile
- `GET /:id/splits`: Retrieve 1km / 1mi distance splits
- `GET /:id/segments`: Retrieve matched segment efforts
- `PATCH /:id`: Edit activity title, description, visibility, or privacy radius
- `DELETE /:id`: Delete workout and cascade cleanups
- `GET /user/:userId`: Retrieve athlete's activities

### Segments (`/api/v1/segments`)
- `GET /`: Browse segments with sport filter and search
- `POST /`: Create new segment from an activity route
- `GET /:id`: Retrieve segment detail and map polyline
- `GET /:id/leaderboard`: Retrieve segment leaderboard (overall, following, or my best)

### Social & Clubs
- `GET /api/v1/social/feed`: Paginated activity feed
- `POST /api/v1/social/follow/:userId`: Follow / unfollow athlete
- `POST /api/v1/social/activities/:activityId/kudos`: Toggle kudos (like)
- `POST /api/v1/social/activities/:activityId/comments`: Add comment
- `GET /api/v1/clubs`: Browse fitness clubs
- `POST /api/v1/clubs`: Create fitness club
- `POST /api/v1/clubs/:id/join`: Join club
- `GET /api/v1/clubs/:id/leaderboard`: Club weekly distance leaderboard
- `GET /api/v1/goals`: Retrieve training goals with dynamic progress percentage
- `POST /api/v1/goals`: Create new goal
- `GET /api/v1/analytics/dashboard`: Aggregate training charts and personal records
