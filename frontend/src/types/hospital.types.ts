import { Coordinates } from './location.types';
import { Incident } from './incident.types';

export interface HospitalDashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  pendingIncidents: number;
  resolvedIncidents: number;
  activeResponders: number;
  availableResponders: number;
  totalAmbulances: number;
  availableAmbulances: number;
  avgResponseTime: number;
  avgTransportTime: number;
  bedOccupancy: number;
  emergencyBedAvailable: number;
}

export interface Ambulance {
  _id: string;
  vehicleNumber: string;
  model: string;
  type: 'basic' | 'advanced' | 'mobile-icu';
  equipment: string[];
  responders: string[];
  currentLocation?: Coordinates;
  status: 'available' | 'en-route' | 'on-scene' | 'transporting' | 'maintenance';
  currentIncidentId?: string;
  lastMaintenance: Date;
  nextMaintenance: Date;
}

export interface HospitalTeam {
  _id: string;
  name: string;
  type: 'paramedic' | 'emt' | 'doctor' | 'driver';
  isAvailable: boolean;
  currentAmbulanceId?: string;
  currentIncidentId?: string;
  certifications: string[];
  experience: number;
}

export interface DispatchRequest {
  incidentId: string;
  ambulanceId: string;
  responders: string[];
  estimatedArrival: number;
  hospitalId: string;
}

export interface HospitalCapacity {
  totalBeds: number;
  occupiedBeds: number;
  emergencyBeds: number;
  icuBeds: number;
  ventilators: number;
  lastUpdated: Date;
}