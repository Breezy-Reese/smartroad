import mongoose, { Schema, Document, Types, Model } from "mongoose";

/* ============================================================
   TYPES
============================================================ */

export interface IWard {
  name: string;
  available: number;
  total: number;
  category: 'icu' | 'emergency' | 'general' | 'theatre';
}

export interface IHospitalStats extends Document {
  hospitalId: Types.ObjectId;

  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;

  averageResponseTime: number;

  availableBeds: number;
  availableAmbulances: number;
  availableResponders: number;

  wards: IWard[];   // ✅ added

  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   SCHEMA
============================================================ */

const WardSchema = new Schema<IWard>(
  {
    name:      { type: String, required: true },
    available: { type: Number, default: 0 },
    total:     { type: Number, default: 0 },
    category:  { type: String, enum: ['icu', 'emergency', 'general', 'theatre'], required: true },
  },
  { _id: false }
);

const HospitalStatsSchema = new Schema<IHospitalStats>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    totalIncidents:    { type: Number, default: 0 },
    activeIncidents:   { type: Number, default: 0 },
    resolvedIncidents: { type: Number, default: 0 },

    averageResponseTime: { type: Number, default: 0 },

    availableBeds:       { type: Number, default: 0 },
    availableAmbulances: { type: Number, default: 0 },
    availableResponders: { type: Number, default: 0 },

    wards: { type: [WardSchema], default: [] },  // ✅ added

    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* ============================================================
   INDEXES
============================================================ */

HospitalStatsSchema.index({ activeIncidents: 1 });
HospitalStatsSchema.index({ availableBeds: 1 });
HospitalStatsSchema.index({ lastUpdated: -1 });

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