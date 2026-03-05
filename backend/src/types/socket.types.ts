import { IIncident } from './incident.types';
import { ILocationUpdate } from './location.types';

export interface ServerToClientEvents {
  // Location Events
  'location-update': (data: ILocationUpdate) => void;
  'driver-status-change': (data: { 
    driverId: string; 
    status: 'online' | 'offline' | 'driving' | 'emergency';
    location?: { lat: number; lng: number };
  }) => void;
  
  // Incident Events
  'new-incident': (incident: IIncident) => void;
  'incident-update': (incident: IIncident) => void;
  'incident-resolved': (incidentId: string) => void;
  'incident-cancelled': (incidentId: string) => void;
  
  // Responder Events
  'responder-accepted': (data: { 
    incidentId: string; 
    responder: any;
    hospitalId: string;
  }) => void;
  'responder-update': (data: { 
    incidentId: string; 
    responders: any[];
  }) => void;
  'responder-location': (data: {
    responderId: string;
    location: { lat: number; lng: number };
    eta?: number;
  }) => void;
  
  // Emergency Events
  'emergency-alert': (data: {
    incidentId: string;
    driverName: string;
    location: { lat: number; lng: number };
    severity: string;
  }) => void;
  'panic-alert': (data: { 
    driverId: string; 
    driverName: string;
    location: { lat: number; lng: number };
    timestamp: Date;
  }) => void;
  
  // Hospital Events
  'hospital-stats-update': (data: {
    hospitalId: string;
    stats: any;
  }) => void;
  
  // System Events
  'system-notification': (data: { 
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timeout?: number;
  }) => void;
  'error': (error: { 
    message: string; 
    code: string;
  }) => void;
}

export interface ClientToServerEvents {
  // Location Events
  'location-update': (data: ILocationUpdate) => void;
  'start-tracking': (driverId: string) => void;
  'stop-tracking': (driverId: string) => void;
  
  // Incident Events
  'report-incident': (data: Partial<IIncident>) => void;
  'confirm-incident': (incidentId: string) => void;
  'update-incident-status': (data: { 
    incidentId: string; 
    status: string;
    notes?: string;
  }) => void;
  
  // Responder Events
  'accept-incident': (data: {
    incidentId: string;
    hospitalId: string;
    responderId: string;
    eta: number;
    distance: number;
  }) => void;
  'update-responder-status': (data: { 
    incidentId: string; 
    status: string;
    location?: { lat: number; lng: number };
  }) => void;
  'update-responder-location': (data: {
    responderId: string;
    location: { lat: number; lng: number };
    status?: string;
  }) => void;
  
  // Emergency Events
  'panic-button': (data: { 
    driverId: string; 
    location: { lat: number; lng: number };
    timestamp: Date;
  }) => void;
  'cancel-emergency': (incidentId: string) => void;
  
  // Connection Events
  'driver-connect': (driverId: string) => void;
  'hospital-connect': (hospitalId: string) => void;
  'responder-connect': (responderId: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  role: string;
  name: string;
}