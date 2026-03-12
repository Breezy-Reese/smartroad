import mongoose, { Schema, Document, Types } from 'mongoose';

/* ============================================================
   TYPES
============================================================ */
export type AmbulanceStatus = 'available' | 'dispatched' | 'maintenance' | 'offline';

export interface IAmbulanceDocument extends Document {
  _id: Types.ObjectId;
  plateNumber: string;
  ambulanceModel: string;
  make: string;
  year?: number;
  status: AmbulanceStatus;
  driverId?: Types.ObjectId;
  driverName?: string;
  location?: { lat: number; lng: number };
  lastService?: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   SCHEMA
============================================================ */
const AmbulanceSchema = new Schema<IAmbulanceDocument>(
  {
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    ambulanceModel: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
    },
    make: {
      type: String,
      required: [true, 'Make is required'],
      trim: true,
    },
    year: { type: Number },
    status: {
      type: String,
      enum: ['available', 'dispatched', 'maintenance', 'offline'],
      default: 'available',
    },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    driverName: { type: String, trim: true },
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    lastService: { type: Date },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
  ret.__v = undefined;
  if (ret._id) ret._id = ret._id.toString();
  if (ret.driverId) ret.driverId = ret.driverId.toString();
  return ret;
}
    },
  }
);

/* ============================================================
   INDEXES
============================================================ */
AmbulanceSchema.index({ status: 1 });
AmbulanceSchema.index({ isActive: 1 });
AmbulanceSchema.index({ driverId: 1 });

/* ============================================================
   MODEL
============================================================ */
export const Ambulance = mongoose.model<IAmbulanceDocument>('Ambulance', AmbulanceSchema);
