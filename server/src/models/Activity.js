import mongoose from 'mongoose';

const SplitSchema = new mongoose.Schema(
  {
    splitNumber: { type: Number, required: true },
    distance: { type: Number, required: true }, // meters
    elapsedTime: { type: Number, required: true }, // seconds
    movingTime: { type: Number, required: true }, // seconds
    averageSpeed: { type: Number, required: true }, // m/s
    elevationChange: { type: Number, default: 0 }, // meters
  },
  { _id: false }
);

const ActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Workout',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    sportType: {
      type: String,
      enum: ['run', 'ride', 'walk', 'hike', 'workout'],
      default: 'run',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
      index: true,
    },
    hideRoute: {
      type: Boolean,
      default: false,
    },
    hideStartFinishRadiusMeters: {
      type: Number,
      default: 0,
      min: 0,
      max: 2000,
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    metrics: {
      distance: { type: Number, default: 0 }, // in meters
      elapsedTime: { type: Number, default: 0 }, // in seconds
      movingTime: { type: Number, default: 0 }, // in seconds
      averageSpeed: { type: Number, default: 0 }, // in meters/sec
      maxSpeed: { type: Number, default: 0 }, // in meters/sec
      elevationGain: { type: Number, default: 0 }, // in meters
      elevationLoss: { type: Number, default: 0 }, // in meters
      averageHeartRate: { type: Number, default: null },
      maxHeartRate: { type: Number, default: null },
      averageCadence: { type: Number, default: null },
      calories: { type: Number, default: 0 },
    },
    summaryPolyline: {
      type: String,
      default: '',
    },
    bounds: {
      minLat: { type: Number, default: null },
      minLng: { type: Number, default: null },
      maxLat: { type: Number, default: null },
      maxLng: { type: Number, default: null },
    },
    startPoint: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    endPoint: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    splits: [SplitSchema],
    kudosCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    fileHash: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ActivitySchema.index({ user: 1, startDate: -1 });
ActivitySchema.index({ sportType: 1, startDate: -1 });
ActivitySchema.index({ visibility: 1, startDate: -1 });

export const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
