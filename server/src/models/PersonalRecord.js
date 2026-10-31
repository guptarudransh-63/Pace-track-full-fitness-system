import mongoose from 'mongoose';

const PersonalRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sportType: {
      type: String,
      enum: ['run', 'ride', 'walk', 'hike'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'fastest_1k',
        'fastest_1mi',
        'fastest_5k',
        'fastest_10k',
        'longest_distance',
        'longest_duration',
        'max_elevation_gain',
      ],
      required: true,
    },
    value: {
      type: Number,
      required: true, // seconds for time PRs, meters for distance/elevation
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    achievedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

PersonalRecordSchema.index({ user: 1, sportType: 1, category: 1 }, { unique: true });

export const PersonalRecord = mongoose.models.PersonalRecord || mongoose.model('PersonalRecord', PersonalRecordSchema);
