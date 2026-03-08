import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGeofenceViolation extends Document {
  geofenceId: Types.ObjectId;
  driverId: Types.ObjectId;
  type: 'entry' | 'exit' | 'dwell';
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GeofenceViolationSchema = new Schema<IGeofenceViolation>(
  {
    geofenceId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Geofence', 
      required: true
      // REMOVED: index: true (handled by schema.index below)
    },
    driverId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true
      // REMOVED: index: true (handled by schema.index below)
    },
    type: { 
      type: String, 
      enum: ['entry', 'exit', 'dwell'], 
      required: true 
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { 
        type: [Number], 
        required: true,
        validate: {
          validator: function(value: number[]) {
            return value.length === 2;
          },
          message: 'Coordinates must be [longitude, latitude]'
        }
      }
    },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: Date,
    notified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Create indexes for efficient querying (single source of truth)
GeofenceViolationSchema.index({ geofenceId: 1, driverId: 1, timestamp: -1 });
GeofenceViolationSchema.index({ location: '2dsphere' });
GeofenceViolationSchema.index({ timestamp: -1 }); // Optional: for time-based queries
GeofenceViolationSchema.index({ resolved: 1 }); // Optional: for filtering resolved/unresolved

export const GeofenceViolation = mongoose.model<IGeofenceViolation>('GeofenceViolation', GeofenceViolationSchema);