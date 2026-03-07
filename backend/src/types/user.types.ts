export type UserRole = 'driver' | 'hospital' | 'admin' | 'responder';

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
  isNotified?: boolean;
}

export interface IMedicalInfo {
  bloodGroup?: string;
  allergies?: string[];
  medicalConditions?: string[];
  medications?: string[];
  emergencyNotes?: string;
  organDonor?: boolean;
}

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;

  profileImage?: string;
  isActive?: boolean;
  isVerified?: boolean;
  lastLogin?: Date;
  refreshToken?: string;

  createdAt?: Date;
  updatedAt?: Date;

  emergencyContacts?: IEmergencyContact[];
  medicalInfo?: IMedicalInfo;

  licenseNumber?: string;
  licenseExpiry?: Date;
  vehicleId?: string;

  hospitalName?: string;
  registrationNumber?: string;
  address?: string;
  location?: ICoordinates;

  contactNumber?: string;
  emergencyContact?: string;

  responderType?: 'ambulance' | 'police' | 'fire' | 'rescue';
  hospitalId?: string;

  currentLocation?: ICoordinates;
  currentIncidentId?: string;

  certifications?: string[];
  experience?: number;

  emailVerificationToken?: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;

  licenseNumber?: string;
  hospitalName?: string;
}