import mongoose from 'mongoose';

const RouteSchema = new mongoose.Schema(
  {
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
    // GeoJSON representation for MongoDB 2dsphere queries
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
    // Detailed sampled GPS points
    points: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        time: { type: Date },
        ele: { type: Number },
        hr: { type: Number },
        cad: { type: Number },
        distFromStart: { type: Number }, // distance in meters from start
      },
    ],
    // Simplified distance-elevation pairs for charts
    elevationProfile: [
      {
        distance: { type: Number }, // meters
        elevation: { type: Number }, // meters
      },
    ],
  },
  {
    timestamps: true,
  }
);

RouteSchema.index({ lineString: '2dsphere' });

export const Route = mongoose.models.Route || mongoose.model('Route', RouteSchema);
