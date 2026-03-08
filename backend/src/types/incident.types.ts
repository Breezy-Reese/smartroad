import { ICoordinates, IEmergencyContact } from './user.types'; // Import IEmergencyContact

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

export interface IIncident {
  _id: string;
  incidentId: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: ICoordinates;
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
  responders: IResponderInfo[];
  emergencyContacts: IEmergencyContact[]; // Now using imported type
  hospitalId?: string;
  assignedAmbulance?: string;
  assignedHospital?: string;
  
  // Metadata
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResponderInfo {
  id: string;
  name: string;
  type: 'ambulance' | 'police' | 'fire' | 'rescue';
  hospital?: string;
  eta: number;
  distance: number;
  status: 'dispatched' | 'en-route' | 'arrived' | 'treating' | 'transporting' | 'completed';
  location?: ICoordinates;
  contactNumber?: string;
  dispatchedAt: Date;
  arrivedAt?: Date;
  completedAt?: Date;
}

// REMOVED: export interface IEmergencyContact { ... }  ← Delete this entire block

export interface IIncidentTimeline {
  _id: string;
  incidentId: string;
  timestamp: Date;
  event: string;
  description: string;
  actor?: string;
  actorId?: string;
  location?: ICoordinates;
  metadata?: Record<string, any>;
}

export interface ICreateIncidentDTO {
  driverId: string;
  driverName: string;
  driverPhone?: string;
  location: ICoordinates;
  type: IncidentType;
  severity?: IncidentSeverity;
  speed?: number;
  impactForce?: number;
  airbagDeployed?: boolean;
  occupants?: number;
  vehicleId?: string;
  vehicleNumber?: string;
  emergencyContacts?: IEmergencyContact[]; // Using imported type
}

export interface IUpdateIncidentDTO {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  responders?: IResponderInfo[];
  hospitalId?: string;
  assignedAmbulance?: string;
  injuries?: number;
  fatalities?: number;
  locationAddress?: string;
}

export interface IAcceptIncidentDTO {
  incidentId: string;
  hospitalId: string;
  responderId: string;
  responderName: string;
  eta: number;
  distance: number;
}