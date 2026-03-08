// src/models/ResponderStatus.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IResponderStatus extends Document {
  responderId: mongoose.Types.ObjectId;
  isAvailable: boolean;
  status: 'available' | 'en-route' | 'on-scene' | 'transporting' | 'off-duty';
  currentLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  currentIncidentId?: mongoose.Types.ObjectId;
  lastUpdate: Date;
}

const responderStatusSchema = new Schema<IResponderStatus>({
  responderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  isAvailable: { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ['available', 'en-route', 'on-scene', 'transporting', 'off-duty'],
    default: 'available'
  },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true, default: [0, 0] }
  },
  currentIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident' },
  lastUpdate: { type: Date, default: Date.now }
});

// Create a geospatial index for location queries
responderStatusSchema.index({ currentLocation: '2dsphere' });

export const ResponderStatus = mongoose.model<IResponderStatus>('ResponderStatus', responderStatusSchema);