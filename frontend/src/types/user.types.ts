import { Coordinates } from './location.types';

/* ================= USER ROLE ================= */

export type UserRole = 'driver' | 'hospital' | 'admin' | 'responder';

/* ================= BASE USER ================= */

export interface User {
  _id: string;

  name: string;
  email: string;
  role: UserRole;

  phone?: string;
  profileImage?: string;

  isActive: boolean;
  isVerified: boolean;

  lastLogin?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/* ================= DRIVER ================= */

export interface Driver extends User {
  role: 'driver';

  licenseNumber: string;
  licenseExpiry: Date | string;

  vehicleId?: string;

  emergencyContacts: EmergencyContact[];

  medicalInfo?: MedicalInfo;

  drivingExperience: number;
  rating: number;
  totalTrips: number;
}

/* ================= HOSPITAL ================= */

export interface Hospital extends User {
  role: 'hospital';

  hospitalName: string;
  registrationNumber: string;

  address: string;

  location: Coordinates;

  contactNumber: string;

  emergencyContact: string;

  capacity: {
    beds: number;
    ambulances: number;
    responders: number;
  };

  services: string[];
}

/* ================= RESPONDER ================= */

export interface Responder extends User {
  role: 'responder';

  hospitalId: string;
  hospitalName: string;

  responderType: 'ambulance' | 'paramedic' | 'doctor' | 'rescue';

  vehicleId?: string;

  isAvailable: boolean;

  currentLocation?: Coordinates;
  currentIncidentId?: string;
}

/* ================= EMERGENCY CONTACT ================= */

export interface EmergencyContact {
  _id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;

  isPrimary: boolean;
  isNotified: boolean;

  createdAt: Date | string;
  updatedAt: Date | string;
}

/* ================= MEDICAL INFO ================= */

export interface MedicalInfo {
  bloodGroup: string;

  allergies: string[];
  medicalConditions: string[];
  medications: string[];

  emergencyNotes?: string;

  organDonor: boolean;
}

/* ================= AUTH ================= */

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/* ✅ FIXED — Exported properly */
export interface RegisterData {
  name: string;
  email: string;
  password: string;

  role: 'driver' | 'hospital';

  phone: string;

  licenseNumber?: string;
  hospitalName?: string;
}

/* ================= AUTH STATE ================= */

export interface AuthState {
  user: User | null;

  token: string | null;
  refreshToken: string | null;

  isLoading: boolean;
  error: string | null;

  isAuthenticated: boolean;
}