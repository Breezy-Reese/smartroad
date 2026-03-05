import { Document } from 'mongoose';

export type UserRole = 'driver' | 'hospital' | 'admin' | 'responder';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IDriver extends IUser {
  role: 'driver';
  licenseNumber: string;
  licenseExpiry: Date;
  vehicleId?: string;
  emergencyContacts: IEmergencyContact[];
  medicalInfo?: IMedicalInfo;
  drivingExperience: number;
  rating: number;
  totalTrips: number;
}

export interface IHospital extends IUser {
  role: 'hospital';
  hospitalName: string;
  registrationNumber: string;
  address: string;
  location: ICoordinates;
  contactNumber: string;
  emergencyContact: string;
  capacity: {
    beds: number;
    ambulances: number;
    responders: number;
  };
  services: string[];
  isAvailable: boolean;
}

export interface IResponder extends IUser {
  role: 'responder';
  responderType: 'ambulance' | 'paramedic' | 'doctor' | 'rescue';
  hospitalId: string;
  hospitalName: string;
  vehicleId?: string;
  isAvailable: boolean;
  currentLocation?: ICoordinates;
  currentIncidentId?: string;
  certifications: string[];
  experience: number;
}

export interface IEmergencyContact {
  _id?: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
  isNotified: boolean;
}

export interface IMedicalInfo {
  bloodGroup: string;
  allergies: string[];
  medicalConditions: string[];
  medications: string[];
  emergencyNotes?: string;
  organDonor: boolean;
}

export interface ICoordinates {
  lat: number;
  lng: number;
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