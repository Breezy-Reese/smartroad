import mongoose, { Schema, Document, Types, Model } from "mongoose";

/* ============================================================
   TYPES
============================================================ */

export type IncidentType     = "collision" | "rollover" | "fire" | "medical" | "other";
export type IncidentSeverity = "low" | "medium" | "high" | "critical" | "fatal";
export type IncidentStatus   =
  | "pending" | "detected" | "confirmed" | "dispatched"
  | "en-route" | "arrived" | "treating" | "transporting"
  | "resolved" | "cancelled" | "false-alarm";
export type ResponderStatus  = "dispatched" | "en-route" | "arrived" | "treating" | "transporting" | "completed";
export type ResponderType    = "ambulance" | "police" | "fire" | "rescue";

/* ============================================================
   GEO LOCATION
============================================================ */

export interface IGeoLocation {
  type: "Point";
  coordinates: [number, number]; // [lng, lat] — GeoJSON order
}

const GeoLocationSchema = new Schema<IGeoLocation>(
  {
    type:        { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

/* ============================================================
   RESPONDER
============================================================ */

export interface IResponderInfo {
  responderId:  Types.ObjectId;
  name:         string;
  type:         ResponderType;
  hospital?:    string;
  eta:          number;
  distance:     number;
  status:       ResponderStatus;
  location?:    { lat: number; lng: number };
  contactNumber?: string;
  dispatchedAt?: Date;
  arrivedAt?:    Date;
  completedAt?:  Date;
}

const ResponderSchema = new Schema<IResponderInfo>(
  {
    responderId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    name:          { type: String, required: true },
    type:          { type: String, enum: ["ambulance", "police", "fire", "rescue"], required: true },
    hospital:      String,
    eta:           { type: Number, required: true },
    distance:      { type: Number, required: true },
    status:        {
      type:    String,
      enum:    ["dispatched", "en-route", "arrived", "treating", "transporting", "completed"],
      default: "dispatched",
    },
    location:      { lat: Number, lng: Number },
    contactNumber: String,
    dispatchedAt:  { type: Date, default: Date.now },
    arrivedAt:     Date,
    completedAt:   Date,
  },
  { _id: false },
);

/* ============================================================
   EMERGENCY CONTACT
============================================================ */

export interface IEmergencyContact {
  name:         string;
  relationship: string;
  phone:        string;
  email?:       string;
  isNotified?:  boolean;
  notifiedAt?:  Date;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name:         { type: String, required: true },
    relationship: { type: String, required: true },
    phone:        { type: String, required: true },
    email:        String,
    isNotified:   { type: Boolean, default: false },
    notifiedAt:   Date,
  },
  { _id: false },
);

/* ============================================================
   INCIDENT DOCUMENT
============================================================ */

export interface IncidentDocument extends Document {
  incidentId:    string;
  driverId:      Types.ObjectId;
  driverName:    string;
  driverPhone?:  string;
  type:          IncidentType;
  severity:      IncidentSeverity;
  status:        IncidentStatus;
  // FIX: location is optional — it may not be available at the moment the
  // panic button is pressed. The frontend patches it in via
  // PATCH /api/incidents/:id/location once GPS resolves.
  location?:         IGeoLocation;
  locationAddress?:  string;
  timestamp:         Date;
  detectedAt:        Date;
  confirmedAt?:      Date;
  resolvedAt?:       Date;
  speed?:            number;
  impactForce?:      number;
  airbagDeployed?:   boolean;
  occupants?:        number;
  injuries?:         number;
  fatalities?:       number;
  vehicleId?:        string;
  vehicleNumber?:    string;
  vehicleMake?:      string;
  vehicleModel?:     string;
  vehicleColor?:     string;
  images?:           string[];
  videos?:           string[];
  responders:        IResponderInfo[];
  emergencyContacts: IEmergencyContact[];
  hospitalId?:       Types.ObjectId;
  assignedAmbulance?: string;
  assignedHospital?:  string;
  createdBy?:        string;
  updatedBy?:        string;
  createdAt:         Date;
  updatedAt:         Date;
}

/* ============================================================
   INCIDENT SCHEMA
============================================================ */

const IncidentSchema = new Schema<IncidentDocument>(
  {
    incidentId: {
  type:     String,
  required: true,
  unique:   true,
  default:  () => `INC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
},
    driverId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    driverName:  { type: String, required: true },
    driverPhone: String,

    type: {
      type:     String,
      enum:     ["collision", "rollover", "fire", "medical", "other"],
      required: true,
    },

    severity: {
      type:    String,
      enum:    ["low", "medium", "high", "critical", "fatal"],
      default: "medium",
    },

    status: {
      type:    String,
      enum:    [
        "pending", "detected", "confirmed", "dispatched",
        "en-route", "arrived", "treating", "transporting",
        "resolved", "cancelled", "false-alarm",
      ],
      default: "pending",
    },

    // FIX: required: false — location is patched in after GPS resolves
    location: { type: GeoLocationSchema, required: false },

    locationAddress: String,
    timestamp:       { type: Date, default: Date.now },
    detectedAt:      { type: Date, default: Date.now },
    confirmedAt:     Date,
    resolvedAt:      Date,

    speed:          Number,
    impactForce:    Number,
    airbagDeployed: { type: Boolean, default: false },
    occupants:      Number,
    injuries:       Number,
    fatalities:     Number,

    vehicleId:     String,
    vehicleNumber: String,
    vehicleMake:   String,
    vehicleModel:  String,
    vehicleColor:  String,

    images: [String],
    videos: [String],

    responders:        [ResponderSchema],
    emergencyContacts: [EmergencyContactSchema],

    hospitalId:        { type: Schema.Types.ObjectId, ref: "User" },
    assignedAmbulance: String,
    assignedHospital:  String,
    createdBy:         String,
    updatedBy:         String,
  },
  { timestamps: true },
);

/* ============================================================
   INDEXES
============================================================ */

// 2dsphere index only applies when location exists — sparse prevents
// index errors on documents where location is still null/undefined.
IncidentSchema.index({ location: "2dsphere" }, { sparse: true });
IncidentSchema.index({ timestamp:  -1 });
IncidentSchema.index({ severity:    1 });
IncidentSchema.index({ status:      1 });
IncidentSchema.index({ driverId:    1 });

/* ============================================================
   MODEL
============================================================ */

export const Incident: Model<IncidentDocument> =
  mongoose.model<IncidentDocument>("Incident", IncidentSchema);