import mongoose from 'mongoose';

const SegmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    distance: {
      type: Number,
      required: true, // meters
    },
    elevationDiff: {
      type: Number,
      default: 0, // net elevation diff in meters
    },
    // GeoJSON Point for start point (2dsphere indexed)
    startPoint: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    endPoint: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    lineString: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString',
      },
      coordinates: {
        type: [[Number]], // [[lng, lat], ...]
        required: true,
      },
    },
    polyline: {
      type: String,
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    effortCount: {
      type: Number,
      default: 0,
    },
    athleteCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

SegmentSchema.index({ startPoint: '2dsphere' });
export const Segment = mongoose.models.Segment || mongoose.model('Segment', SegmentSchema);
