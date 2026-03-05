import mongoose, { Schema, Document } from 'mongoose';

export interface IHospitalStats extends Document {
  hospitalId: string;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  averageResponseTime: number;
  availableBeds: number;
  availableAmbulances: number;
  availableResponders: number;
  lastUpdated: Date;
}

const HospitalStatsSchema = new Schema<IHospitalStats>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalIncidents: {
      type: Number,
      default: 0,
    },
    activeIncidents: {
      type: Number,
      default: 0,
    },
    resolvedIncidents: {
      type: Number,
      default: 0,
    },
    averageResponseTime: {
      type: Number,
      default: 0,
    },
    availableBeds: {
      type: Number,
      default: 0,
    },
    availableAmbulances: {
      type: Number,
      default: 0,
    },
    availableResponders: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Update lastUpdated on save
HospitalStatsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export const HospitalStats = mongoose.model<IHospitalStats>('HospitalStats', HospitalStatsSchema);