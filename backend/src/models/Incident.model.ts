import mongoose, { Schema, Document } from 'mongoose';
import { 
  IIncident, 
  IResponderInfo, 
  IncidentStatus, 
  IncidentSeverity, 
  IncidentType 
} from '../types/incident.types';

export interface IIncidentDocument extends IIncident, Document {}

const ResponderInfoSchema = new Schema<IResponderInfo>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['ambulance', 'police', 'fire', 'rescue'],
    required: true 
  },
  hospital: { type: String },
  eta: { type: Number, required: true },
  distance: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['dispatched', 'en-route', 'arrived', 'treating', 'transporting', 'completed'],
    default: 'dispatched'
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
  },
  contactNumber: { type: String },
  dispatchedAt: { type: Date, default: Date.now },
  arrivedAt: { type: Date },
  completedAt: { type: Date },
});

const EmergencyContactSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  isNotified: { type: Boolean, default: false },
  notifiedAt: { type: Date },
});

const IncidentSchema = new Schema<IIncidentDocument>(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      default: () => `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    driverPhone: {
      type: String,
    },
    type: {
      type: String,
      enum: ['collision', 'rollover', 'fire', 'medical', 'other'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical', 'fatal'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: [
        'pending', 'detected', 'confirmed', 'dispatched', 'en-route',
        'arrived', 'treating', 'transporting', 'resolved', 'cancelled', 'false-alarm'
      ],
      default: 'pending',
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    locationAddress: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
    },
    confirmedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    
    // Incident Details
    speed: {
      type: Number,
    },
    impactForce: {
      type: Number,
    },
    airbagDeployed: {
      type: Boolean,
      default: false,
    },
    occupants: {
      type: Number,
      default: 1,
    },
    injuries: {
      type: Number,
      default: 0,
    },
    fatalities: {
      type: Number,
      default: 0,
    },
    
    // Vehicle Info
    vehicleId: {
      type: String,
    },
    vehicleNumber: {
      type: String,
    },
    vehicleMake: {
      type: String,
    },
    vehicleModel: {
      type: String,
    },
    vehicleColor: {
      type: String,
    },
    
    // Media
    images: [{
      type: String,
    }],
    videos: [{
      type: String,
    }],
    
    // Response
    responders: [ResponderInfoSchema],
    emergencyContacts: [EmergencyContactSchema],
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAmbulance: {
      type: String,
    },
    assignedHospital: {
      type: String,
    },
    
    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
IncidentSchema.index({ incidentId: 1 });
IncidentSchema.index({ driverId: 1 });
IncidentSchema.index({ status: 1 });
IncidentSchema.index({ severity: 1 });
IncidentSchema.index({ timestamp: -1 });
IncidentSchema.index({ 'location.lat': 1, 'location.lng': 1 });
IncidentSchema.index({ hospitalId: 1 });
IncidentSchema.index({ createdAt: -1 });

// Pre-save middleware to generate incident ID if not provided
IncidentSchema.pre('save', function(next) {
  if (!this.incidentId) {
    this.incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

export const Incident = mongoose.model<IIncidentDocument>('Incident', IncidentSchema);