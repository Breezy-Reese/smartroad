import mongoose, { Schema, Document, Types, Model } from "mongoose";

/* ============================================================
   TYPES
============================================================ */

export interface IHospitalStats extends Document {
  hospitalId: Types.ObjectId;

  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;

  averageResponseTime: number;

  availableBeds: number;
  availableAmbulances: number;
  availableResponders: number;

  lastUpdated: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   SCHEMA
============================================================ */

const HospitalStatsSchema = new Schema<IHospitalStats>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    totalIncidents: {
      type: Number,
      default: 0
    },

    activeIncidents: {
      type: Number,
      default: 0,
      index: true
    },

    resolvedIncidents: {
      type: Number,
      default: 0
    },

    averageResponseTime: {
      type: Number,
      default: 0
    },

    availableBeds: {
      type: Number,
      default: 0
    },

    availableAmbulances: {
      type: Number,
      default: 0
    },

    availableResponders: {
      type: Number,
      default: 0
    },

    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/* ============================================================
   INDEXES
============================================================ */

HospitalStatsSchema.index({ hospitalId: 1 });
HospitalStatsSchema.index({ activeIncidents: 1 });
HospitalStatsSchema.index({ availableBeds: 1 });

/* ============================================================
   MIDDLEWARE
============================================================ */

HospitalStatsSchema.pre<IHospitalStats>("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

/* ============================================================
   MODEL
============================================================ */

export const HospitalStats: Model<IHospitalStats> =
  mongoose.model<IHospitalStats>("HospitalStats", HospitalStatsSchema);
