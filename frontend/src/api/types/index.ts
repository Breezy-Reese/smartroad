// src/api/types/index.ts
// Shared types that mirror your backend models

// ─── Common ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export type UserRole = 'driver' | 'hospital' | 'admin' | 'responder';

export type ResponderType = 'ambulance' | 'police' | 'fire' | 'rescue';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;

  // Driver
  licenseNumber?: string;
  licenseExpiry?: string;
  vehicleId?: string;
  vehicleNumber?: string;

  // Hospital
  hospitalName?: string;
  registrationNumber?: string;
  address?: string;
  location?: ICoordinates;
  contactNumber?: string;

  // Responder
  responderType?: ResponderType;
  hospitalId?: string;
  certifications?: string[];
  experience?: number;

  emergencyContacts?: IEmergencyContact[];
  medicalInfo?: IMedicalInfo;
}

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IEmergencyContact {
  _id?: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

export interface IMedicalInfo {
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string[];
  medicalConditions?: string[];
  medications?: string[];
  emergencyNotes?: string;
  organDonor?: boolean;
}

// ─── Auth Payloads ────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  licenseNumber?: string;
  hospitalName?: string;
  responderType?: ResponderType;
  hospitalId?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: IUser;
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshResponse {
  success: boolean;
  data: { accessToken: string };
}

// ─── Incident ─────────────────────────────────────────────────────────────────

export type IncidentType = 'collision' | 'rollover' | 'fire' | 'medical' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical' | 'fatal';
export type IncidentStatus =
  | 'pending' | 'detected' | 'confirmed' | 'dispatched'
  | 'en-route' | 'arrived' | 'treating' | 'transporting'
  | 'resolved' | 'cancelled' | 'false-alarm';

export interface IIncident {
  _id: string;
  incidentId: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: { type: 'Point'; coordinates: [number, number] };
  locationAddress?: string;
  timestamp: string;
  detectedAt: string;
  confirmedAt?: string;
  resolvedAt?: string;
  speed?: number;
  impactForce?: number;
  airbagDeployed?: boolean;
  occupants?: number;
  responders: IResponderInfo[];
  vehicleNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IResponderInfo {
  responderId: string;
  name: string;
  type: ResponderType;
  eta: number;
  distance: number;
  status: 'dispatched' | 'en-route' | 'arrived' | 'treating' | 'transporting' | 'completed';
  location?: ICoordinates;
  contactNumber?: string;
  dispatchedAt?: string;
  arrivedAt?: string;
}

export interface CreateIncidentPayload {
  type: IncidentType;
  severity: IncidentSeverity;
  location: { type: 'Point'; coordinates: [number, number] };
  locationAddress?: string;
  speed?: number;
  impactForce?: number;
  airbagDeployed?: boolean;
  occupants?: number;
  vehicleNumber?: string;
}

// ─── Responder Status ─────────────────────────────────────────────────────────

export type ResponderStatusType = 'available' | 'en-route' | 'on-scene' | 'transporting' | 'off-duty';

export interface IResponderStatus {
  _id: string;
  responderId: string;
  isAvailable: boolean;
  status: ResponderStatusType;
  currentLocation: { type: 'Point'; coordinates: [number, number] };
  currentIncidentId?: string;
  lastUpdate: string;
}

// ─── Hospital ─────────────────────────────────────────────────────────────────

export interface IHospital {
  _id: string;
  name: string;
  hospitalName: string;
  registrationNumber?: string;
  address?: string;
  location?: ICoordinates;
  contactNumber?: string;
  emergencyContact?: string;
  isActive: boolean;
}

export interface DispatchResponderPayload {
  incidentId: string;
  responderId: string;
}
