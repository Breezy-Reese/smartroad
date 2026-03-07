import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/user.types';

export interface IUserDocument extends Document, IUser {}
export interface IResponderStatus extends Document {
  responderId: string;
  isAvailable: boolean;
  currentLocation: {
    lat: number;
    lng: number;
  };
  currentIncidentId?: string;
  lastUpdate: Date;
  status: 'available' | 'en-route' | 'on-scene' | 'transporting' | 'off-duty';
}

const ResponderStatusSchema = new Schema<IResponderStatus>(
  {
    responderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    currentLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    currentIncidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['available', 'en-route', 'on-scene', 'transporting', 'off-duty'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
ResponderStatusSchema.index({ currentLocation: '2dsphere' });
ResponderStatusSchema.index({ isAvailable: 1 });
ResponderStatusSchema.index({ status: 1 });

export const ResponderStatus = mongoose.model<IResponderStatus>('ResponderStatus', ResponderStatusSchema);