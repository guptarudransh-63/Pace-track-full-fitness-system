import mongoose from 'mongoose';

const SegmentEffortSchema = new mongoose.Schema(
  {
    segment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Segment',
      required: true,
      index: true,
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sportType: {
      type: String,
      enum: ['run', 'ride', 'walk', 'hike'],
      default: 'run',
    },
    elapsedTime: {
      type: Number,
      required: true, // seconds
    },
    movingTime: {
      type: Number,
      required: true, // seconds
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    avgSpeed: {
      type: Number,
      required: true, // m/s
    },
    avgHeartRate: {
      type: Number,
      default: null,
    },
    isPersonalRecord: {
      type: Boolean,
      default: false,
    },
    rank: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SegmentEffortSchema.index({ segment: 1, elapsedTime: 1 });
SegmentEffortSchema.index({ segment: 1, user: 1, elapsedTime: 1 });
SegmentEffortSchema.index({ activity: 1, segment: 1 }, { unique: true });

export const SegmentEffort = mongoose.models.SegmentEffort || mongoose.model('SegmentEffort', SegmentEffortSchema);
