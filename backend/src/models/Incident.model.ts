import mongoose, { Schema, Document } from "mongoose";
import { Incident, IResponderInfo, IEmergencyContact } from "../types/incident.types";
import { IUser } from "../types";

export interface IUserDocument extends Document, IUser {}

const CoordinatesSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  { _id: false }
);

const ResponderSchema = new Schema<IResponderInfo>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["ambulance", "police", "fire", "rescue"],
      required: true
    },
    hospital: { type: String },
    eta: { type: Number, required: true },
    distance: { type: Number, required: true },
    status: {
      type: String,
      enum: ["dispatched", "en-route", "arrived", "treating", "transporting", "completed"],
      default: "dispatched"
    },
    location: CoordinatesSchema,
    contactNumber: String,
    dispatchedAt: { type: Date, default: Date.now },
    arrivedAt: Date,
    completedAt: Date
  },
  { _id: false }
);

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    isNotified: { type: Boolean, default: false },
    notifiedAt: Date
  },
  { _id: false }
);

const IncidentSchema = new Schema<IncidentDocument>(
  {
    incidentId: { type: String, required: true, unique: true },

    driverId: { type: String, required: true },
    driverName: { type: String, required: true },
    driverPhone: String,

    type: {
      type: String,
      enum: ["collision", "rollover", "fire", "medical", "other"],
      required: true
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical", "fatal"],
      default: "medium"
    },

    status: {
      type: String,
      enum: [
        "pending",
        "detected",
        "confirmed",
        "dispatched",
        "en-route",
        "arrived",
        "treating",
        "transporting",
        "resolved",
        "cancelled",
        "false-alarm"
      ],
      default: "pending"
    },

    location: { type: CoordinatesSchema, required: true },

    locationAddress: String,

    timestamp: { type: Date, default: Date.now },
    detectedAt: { type: Date, default: Date.now },

    confirmedAt: Date,
    resolvedAt: Date,

    speed: Number,
    impactForce: Number,
    airbagDeployed: { type: Boolean, default: false },
    occupants: Number,
    injuries: Number,
    fatalities: Number,

    vehicleId: String,
    vehicleNumber: String,
    vehicleMake: String,
    vehicleModel: String,
    vehicleColor: String,

    images: [String],
    videos: [String],

    responders: [ResponderSchema],
    emergencyContacts: [EmergencyContactSchema],

    hospitalId: String,
    assignedAmbulance: String,
    assignedHospital: String,

    createdBy: String,
    updatedBy: String
  },
  { timestamps: true }
);

export const Incident = mongoose.model<IncidentDocument>(
  "Incident",
  IncidentSchema
);