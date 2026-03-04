
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
  | "accident"
  | "fire"
  | "medical"
  | "crime"
  | "other";

export type IncidentStatus =
  | "reported"
  | "assigned"
  | "responding"
  | "resolved"
  | "closed";

export type ResponderStatus =
  | "online"
  | "offline"
  | "driving"
  | "emergency";

// ----------------------
// INTERFACES
// ----------------------

export interface Location {
  lng: any;
  lat: any;
  latitude: number;
  longitude: number;
}

export interface ResponderInfo {
  eta: number;
  id: string;
  name: string;
  role: string; // driver | hospital | police etc
  status: ResponderStatus;
  location?: Location;
  phone?: string;
}

export interface EmergencyAlert {
  timestamp: string | number | Date;
  driverName: any;
  id: string;
  message: string;
  createdAt: string;
  severity: IncidentSeverity;
}

export interface Incident {
  driver: any;
  _id(_id: any): void;
  speed: number;
  timestamp(timestamp: any): import("react").ReactNode;
  vehicleNumber: string;
  locationAddress: any;
  incidentId: string;
  driverId: string | undefined;
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: Location;

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
}

export interface UpdateIncidentDto {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  location?: Location;
}