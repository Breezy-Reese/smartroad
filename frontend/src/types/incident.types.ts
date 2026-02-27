import { User, Driver, EmergencyContact } from './user.types';
import { Coordinates } from './location.types';

export type IncidentStatus = 
  | 'pending' 
  | 'detected' 
  | 'confirmed' 
  | 'dispatched' 
  | 'en-route' 
  | 'arrived' 
  | 'treating'
  | 'transporting'
  | 'resolved' 
  | 'cancelled'
  | 'false-alarm';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical' | 'fatal';
export type IncidentType = 'collision' | 'rollover' | 'fire' | 'medical' | 'other';

export interface Incident {
  _id: string;
  incidentId: string;
  driverId: string;
  driver?: Driver;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: Coordinates;
  locationAddress?: string;
  timestamp: Date;
  detectedAt: Date;
  confirmedAt?: Date;
  resolvedAt?: Date;
  
  // Incident Details
  speed?: number;
  impactForce?: number;
  airbagDeployed: boolean;
  occupants?: number;
  injuries?: number;
  fatalities?: number;
  
  // Vehicle Info
  vehicleId?: string;
  vehicleNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  
  // Media
  images?: string[];
  videos?: string[];
  
  // Response
  responders: ResponderInfo[];
  emergencyContacts: EmergencyContact[];
  hospitalId?: string;
  assignedAmbulance?: string;
  assignedHospital?: string;
  
  // Metadata
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResponderInfo {
  id: string;
  name: string;
  type: 'ambulance' | 'police' | 'fire' | 'rescue';
  hospital?: string;
  eta: number;
  distance: number;
  status: 'dispatched' | 'en-route' | 'arrived' | 'treating' | 'transporting' | 'completed';
  location?: Coordinates;
  contactNumber?: string;
  dispatchedAt: Date;
  arrivedAt?: Date;
  completedAt?: Date;
}

export interface IncidentReport {
  incident: Incident;
  timeline: IncidentTimeline[];
  responders: ResponderInfo[];
  witnessReports?: WitnessReport[];
}

export interface IncidentTimeline {
  _id: string;
  incidentId: string;
  timestamp: Date;
  event: string;
  description: string;
  actor?: string;
  actorId?: string;
  location?: Coordinates;
  metadata?: Record<string, any>;
}

export interface WitnessReport {
  _id: string;
  incidentId: string;
  witnessId: string;
  name: string;
  phone: string;
  statement: string;
  timestamp: Date;
  images?: string[];
  isVerified: boolean;
}

export interface EmergencyAlert {
  incidentId: string;
  driverName: string;
  driverPhone: string;
  driverId: string;
  location: Coordinates;
  severity: IncidentSeverity;
  timestamp: Date;
  message: string;
  eta?: number;
}

export interface CreateIncidentDto {
  driverId: string;
  location: Coordinates;
  type: IncidentType;
  severity?: IncidentSeverity;
  speed?: number;
  impactForce?: number;
  airbagDeployed?: boolean;
  occupants?: number;
  vehicleId?: string;
}

export interface UpdateIncidentDto {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  responders?: ResponderInfo[];
  hospitalId?: string;
  assignedAmbulance?: string;
  injuries?: number;
  fatalities?: number;
}

export interface IncidentStats {
  total: number;
  active: number;
  resolved: number;
  bySeverity: Record<IncidentSeverity, number>;
  byType: Record<IncidentType, number>;
  averageResponseTime: number;
  averageResolutionTime: number;
}