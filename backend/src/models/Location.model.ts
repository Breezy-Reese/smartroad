import mongoose, { Schema, Document, Types, Model } from 'mongoose';

/* ============================================================
   TYPES
============================================================ */

export type DriverStatus = 'driving' | 'idle' | 'stopped' | 'emergency';

export interface IGeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface ILocationDocument extends Document {
  driverId: Types.ObjectId;
  driverName?: string;

  vehicleId?: string;
  vehicleNumber?: string;

  latitude: number;
  longitude: number;

  location: IGeoLocation;

  speed?: number;
  accuracy: number;
  heading?: number;
  altitude?: number;
  altitudeAccuracy?: number;

  timestamp: Date;
  status: DriverStatus;

  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   GEO LOCATION SCHEMA
============================================================ */

const GeoLocationSchema = new Schema<IGeoLocation>(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false }
);

/* ============================================================
   LOCATION SCHEMA
============================================================ */

const LocationSchema = new Schema<ILocationDocument>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // REMOVED: index: true (handled by schema.index below)
    },

    driverName: {
      type: String,
    },

    vehicleId: {
      type: String,
    },

    vehicleNumber: {
      type: String,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    location: {
      type: GeoLocationSchema,
      required: true,
    },

    speed: {
      type: Number,
      default: 0,
    },

    accuracy: {
      type: Number,
      required: true,
    },

    heading: {
      type: Number,
    },

    altitude: {
      type: Number,
    },

    altitudeAccuracy: {
      type: Number,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      // REMOVED: index: true (handled by schema.index below)
    },

    status: {
      type: String,
      enum: ['driving', 'idle', 'stopped', 'emergency'],
      default: 'driving',
      // REMOVED: index: true (handled by schema.index below)
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
   INDEXES
============================================================ */

// Driver timeline
LocationSchema.index({ driverId: 1, timestamp: -1 });

// Auto-delete location after 7 days
LocationSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 604800 }
);

// Fast location search
LocationSchema.index({
  latitude: 1,
  longitude: 1,
  timestamp: -1,
});

// Geospatial queries
LocationSchema.index({ location: '2dsphere' });

/* ============================================================
   PRE-SAVE MIDDLEWARE
============================================================ */

LocationSchema.pre<ILocationDocument>('save', function (next) {
  this.location = {
    type: 'Point',
    coordinates: [this.longitude, this.latitude],
  };

  next();
});

/* ============================================================
   MODEL
============================================================ */

export const Location: Model<ILocationDocument> =
  mongoose.model<ILocationDocument>('Location', LocationSchema);