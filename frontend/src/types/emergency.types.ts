// src/types/emergency.types.ts

// ----------------------
// ENUMS
// ----------------------

export type IncidentSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "fatal";

export type IncidentType =
  | "collision"
  | "rollover"
  | "fire"
  | "medical"
  | "other";

export type IncidentStatus =
  | "pending"
  | "reported"
  | "assigned"
  | "responding"
  | "resolved"
  | "closed"
  | "cancelled";

export type ResponderStatus =
  | "online"
  | "offline"
  | "driving"
  | "emergency";

// ----------------------
// INTERFACES
// ----------------------

export interface Location {
  latitude: number;
  longitude: number;

  // compatibility with map libraries
  lat?: number;
  lng?: number;
}
export interface ResponderInfo {
  id: string;
  name: string;
  role: string; // driver | hospital | police
  status: ResponderStatus;
  eta: number;
  location?: Location;
  phone?: string;
}

export interface EmergencyAlert {
  id: string;
  message: string;
  severity: IncidentSeverity;
  timestamp: string | number | Date;
  createdAt: string;
  driverName?: string;
}

export interface Incident {
  _id: string;
  id?: string;

  title: string;
  description: string;

  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;

  location: Location;
  locationAddress?: string;

  speed?: number;
  vehicleNumber?: string;

  driverId?: string;
  driver?: any;

  timestamp: string | number | Date;

  incidentId?: string;

  createdAt: string;
  updatedAt?: string;

  reportedBy: string;

  responders: ResponderInfo[];
  alerts?: EmergencyAlert[];
}

// ----------------------
// DTOs (for API requests)
// ----------------------

export interface CreateIncidentDto {
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: Location;
  driverId?: string;
}

export interface UpdateIncidentDto {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  location?: Location;
}
export interface IncidentReport {
  incidentId: string;
  message: string;
  createdAt?: string;
}