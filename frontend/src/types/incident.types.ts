// src/types/incident.types.ts

export type IncidentSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'fatal';

export type IncidentStatus =
  | 'reported'
  | 'investigating'
  | 'resolved'
  | 'closed';

export type IncidentType =
  | 'accident'
  | 'fire'
  | 'medical'
  | 'collision'
  | 'other';

export interface IncidentDriver {
  _id: string;
  name: string;
  phone?: string;
  vehiclePlate?: string;
}

export interface IncidentLocation {
  lat: number;
  lng: number;
}

export interface Incident {
  _id: string;
  incidentId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description?: string;

  location: IncidentLocation;

  driver?: IncidentDriver;

  timestamp?: string | Date;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/* DTO for creating incident */
export interface CreateIncidentDto {
  type: IncidentType;
  severity: IncidentSeverity;
  description?: string;
  location: IncidentLocation;
  driverId?: string;
}