import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sportType: {
      type: String,
      enum: ['all', 'run', 'ride', 'walk', 'hike'],
      default: 'all',
    },
    metricType: {
      type: String,
      enum: ['distance', 'time', 'elevation', 'activities_count'],
      required: true,
    },
    targetValue: {
      type: Number,
      required: true, // distance in meters, time in seconds, elevation in meters, or count
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'custom'],
      default: 'weekly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

GoalSchema.index({ user: 1, startDate: -1 });

export const Goal = mongoose.models.Goal || mongoose.model('Goal', GoalSchema);
