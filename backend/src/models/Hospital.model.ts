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
      unique: true  // This creates the index automatically
      // REMOVED: index: true - handled by unique:true
    },

    totalIncidents: {
      type: Number,
      default: 0
    },

    activeIncidents: {
      type: Number,
      default: 0
      // REMOVED: index: true - index added in INDEXES section
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

// All indexes defined here (single source of truth)
// REMOVED: HospitalStatsSchema.index({ hospitalId: 1 }, { unique: true }); 
// The unique index is already created by unique:true in the field definition

// Additional performance indexes
HospitalStatsSchema.index({ activeIncidents: 1 });
HospitalStatsSchema.index({ availableBeds: 1 });
HospitalStatsSchema.index({ lastUpdated: -1 }); // Added for sorting by last updated

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