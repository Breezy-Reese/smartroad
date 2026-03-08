import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGeofence extends Document {
  name: string;
  type: 'circle' | 'polygon' | 'rectangle';
  center?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  radius?: number; // in km
  points?: number[][][]; // For polygons
  alertOnEntry: boolean;
  alertOnExit: boolean;
  alertOnDwell?: boolean;
  dwellTime?: number; // minutes
  enabled: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GeofenceSchema = new Schema<IGeofence>(
  {
    name: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: ['circle', 'polygon', 'rectangle'], 
      required: true 
    },
    center: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: false }
    },
    radius: { type: Number, min: 0.1 },
    points: { type: Schema.Types.Mixed },
    alertOnEntry: { type: Boolean, default: true },
    alertOnExit: { type: Boolean, default: true },
    alertOnDwell: { type: Boolean, default: false },
    dwellTime: { type: Number, default: 5, min: 1 },
    enabled: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Create geospatial index for center point
GeofenceSchema.index({ center: '2dsphere' });

export const Geofence = mongoose.model<IGeofence>('Geofence', GeofenceSchema);
