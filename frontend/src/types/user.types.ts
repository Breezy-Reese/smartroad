export type UserRole = 'driver' | 'hospital' | 'admin' | 'responder';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver extends User {
  role: 'driver';
  licenseNumber: string;
  licenseExpiry: Date;
  vehicleId?: string;
  emergencyContacts: EmergencyContact[];
  medicalInfo?: MedicalInfo;
  drivingExperience: number;
  rating: number;
  totalTrips: number;
}

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

export interface EmergencyContact {
  _id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  isNotified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalInfo {
  bloodGroup: string;
  allergies: string[];
  medicalConditions: string[];
  medications: string[];
  emergencyNotes?: string;
  organDonor: boolean;
}

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

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  phone: string;
  licenseNumber?: string;
  hospitalName?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}