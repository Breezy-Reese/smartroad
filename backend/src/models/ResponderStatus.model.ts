import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export type ResponderStatusType =
  | 'available'
  | 'en-route'
  | 'on-scene'
  | 'transporting'
  | 'off-duty';

export interface IGeoLocation {
  type: 'Point';
  coordinates: [number, number];
}

export interface IResponderStatus extends Document {
  responderId: Types.ObjectId;
  isAvailable: boolean;
  currentLocation: IGeoLocation;
  currentIncidentId?: Types.ObjectId;
  status: ResponderStatusType;
  lastUpdate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GeoLocationSchema = new Schema<IGeoLocation>(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value: number[]) => value.length === 2,
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

const ResponderStatusSchema = new Schema<IResponderStatus>(
  {
    responderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    isAvailable: { type: Boolean, default: true },
    currentLocation: { type: GeoLocationSchema, required: true },
    currentIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident', default: null },
    status: {
      type: String,
      enum: ['available', 'en-route', 'on-scene', 'transporting', 'off-duty'],
      default: 'available',
    },
    lastUpdate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ResponderStatusSchema.index({ currentLocation: '2dsphere' });
ResponderStatusSchema.index({ status: 1, isAvailable: 1 });
ResponderStatusSchema.index({ currentIncidentId: 1 });

export const ResponderStatus: Model<IResponderStatus> =
  mongoose.model<IResponderStatus>('ResponderStatus', ResponderStatusSchema);