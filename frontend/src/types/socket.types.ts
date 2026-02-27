import { Incident, EmergencyAlert, ResponderInfo } from './incident.types';
import { DriverLocation, ResponderLocation } from './location.types';

export type SocketEvent = 
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'location-update'
  | 'new-incident'
  | 'incident-update'
  | 'responder-accepted'
  | 'responder-update'
  | 'driver-status-change'
  | 'emergency-alert'
  | 'panic-button'
  | 'hospital-stats-update';

export interface ServerToClientEvents {
  // Location Events
  'location-update': (data: DriverLocation) => void;
  'driver-status-change': (data: { 
    driverId: string; 
    status: 'online' | 'offline' | 'driving' | 'emergency';
    location?: Coordinates;
  }) => void;
  
  // Incident Events
  'new-incident': (incident: Incident) => void;
  'incident-update': (incident: Incident) => void;
  'incident-resolved': (incidentId: string) => void;
  'incident-cancelled': (incidentId: string) => void;
  
  // Responder Events
  'responder-accepted': (data: { 
    incidentId: string; 
    responder: ResponderInfo;
    hospitalId: string;
  }) => void;
  'responder-update': (data: { 
    incidentId: string; 
    responders: ResponderInfo[];
  }) => void;
  'responder-location': (data: ResponderLocation) => void;
  
  // Emergency Events
  'emergency-alert': (alert: EmergencyAlert) => void;
  'panic-alert': (data: { 
    driverId: string; 
    driverName: string;
    location: Coordinates;
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
    timestamp: Date;
  }) => void;
}

export interface ClientToServerEvents {
  // Location Events
  'location-update': (data: DriverLocation) => void;
  'start-tracking': (driverId: string) => void;
  'stop-tracking': (driverId: string) => void;
  
  // Incident Events
  'report-incident': (data: Partial<Incident>) => void;
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
  }) => void;
  'update-responder-status': (data: { 
    incidentId: string; 
    status: string;
    location?: Coordinates;
  }) => void;
  'update-responder-location': (data: ResponderLocation) => void;
  
  // Emergency Events
  'panic-button': (data: { 
    driverId: string; 
    location: Coordinates;
    timestamp: Date;
  }) => void;
  'cancel-emergency': (incidentId: string) => void;
  
  // Connection Events
  'driver-connect': (driverId: string) => void;
  'hospital-connect': (hospitalId: string) => void;
  'responder-connect': (responderId: string) => void;
  'disconnect': () => void;
}

export interface SocketState {
  connected: boolean;
  driverId?: string;
  hospitalId?: string;
  responderId?: string;
  error?: string;
  reconnectAttempt: number;
  lastPing?: Date;
  lastPong?: Date;
}

export interface SocketConfig {
  url: string;
  options: {
    transports: string[];
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    reconnectionDelayMax: number;
    timeout: number;
    autoConnect: boolean;
    query?: Record<string, string>;
    auth?: Record<string, any>;
  };
}