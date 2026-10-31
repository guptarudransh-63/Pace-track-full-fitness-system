import mongoose from 'mongoose';

const ClubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    sportType: {
      type: String,
      enum: ['all', 'run', 'ride', 'walk', 'triathlon'],
      default: 'all',
      index: true,
    },
    city: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    coverPhoto: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberCount: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const ClubMemberSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
  },
  { timestamps: true }
);

ClubMemberSchema.index({ club: 1, user: 1 }, { unique: true });

export const Club = mongoose.models.Club || mongoose.model('Club', ClubSchema);
export const ClubMember = mongoose.models.ClubMember || mongoose.model('ClubMember', ClubMemberSchema);
