import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export interface IUserDocument extends Document, IUser {}

const LocationSchema = new Schema<ILocationDocument>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
      index: true,
    },
    status: {
      type: String,
      enum: ['driving', 'idle', 'stopped', 'emergency'],
      default: 'driving',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
LocationSchema.index({ driverId: 1, timestamp: -1 });
LocationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 }); // Auto-delete after 7 days
LocationSchema.index({ 
  latitude: 1, 
  longitude: 1,
  timestamp: -1 
});

// Geospatial index for location-based queries
LocationSchema.index({ 
  location: '2dsphere' 
});

// Pre-save middleware to create geospatial point
LocationSchema.pre('save', function(next) {
  (this as any).location = {
    type: 'Point',
    coordinates: [this.longitude, this.latitude]
  };
  next();
});

export const Location = mongoose.model<ILocationDocument>('Location', LocationSchema);