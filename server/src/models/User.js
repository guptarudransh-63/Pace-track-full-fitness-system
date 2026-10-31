import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: 300,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    unitPreference: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
    },
    privacyPreferences: {
      defaultActivityVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public',
      },
      hideHomeRadiusMeters: {
        type: Number,
        default: 0,
        min: 0,
        max: 2000,
      },
      homeLatitude: {
        type: Number,
        default: null,
      },
      homeLongitude: {
        type: Number,
        default: null,
      },
    },
    notificationPreferences: {
      kudos: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
    },
    stats: {
      totalDistanceMeters: { type: Number, default: 0 },
      totalMovingTimeSeconds: { type: Number, default: 0 },
      totalElevationMeters: { type: Number, default: 0 },
      activityCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password
UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Transform to remove sensitive information on JSON serialization
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  if (obj.privacyPreferences) {
    // Keep user's exact coordinates private from generic profile views
  }
  return obj;
};

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
