// src/types/socket.types.ts

import { Coordinates, DriverLocation, ResponderLocation } from './location.types';
import { Incident, EmergencyAlert, ResponderInfo } from './emergency.types';

/* ================= SOCKET EVENT TYPES ================= */

export type SocketEvent =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'location-update'
  | 'new-incident'
  | 'incident-update'
  | 'incident-resolved'
  | 'incident-cancelled'
  | 'responder-accepted'
  | 'responder-update'
  | 'responder-location'
  | 'driver-status-change'
  | 'emergency-alert'
  | 'panic-button'
  | 'hospital-stats-update'
  | 'system-notification';

/* ================= SERVER → CLIENT EVENTS ================= */

export interface ServerToClientEvents {

  /* Location */
  'location-update': (data: DriverLocation) => void;

  'driver-status-change': (data: {
    driverId: string;
    status: 'online' | 'offline' | 'driving' | 'emergency';
    location?: Coordinates;
  }) => void;

  /* Incident */
  'new-incident': (incident: Incident) => void;
  'incident-update': (incident: Incident) => void;
  'incident-resolved': (incidentId: string) => void;
  'incident-cancelled': (incidentId: string) => void;

  /* Responders */
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

  /* Emergency */
  'emergency-alert': (alert: EmergencyAlert) => void;

  'panic-alert': (data: {
    driverId: string;
    driverName: string;
    location: Coordinates;
    timestamp: Date;
  }) => void;

  /* Hospital */
  'hospital-stats-update': (data: {
    hospitalId: string;
    stats: any;
  }) => void;

  /* System */
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

/* ================= CLIENT → SERVER EVENTS ================= */

export interface ClientToServerEvents {

  /* Location */
  'location-update': (data: DriverLocation) => void;
  'start-tracking': (driverId: string) => void;
  'stop-tracking': (driverId: string) => void;

  /* Incident */
  'report-incident': (data: Partial<Incident>) => void;
  'confirm-incident': (incidentId: string) => void;
  'update-incident-status': (data: {
    incidentId: string;
    status: string;
    notes?: string;
  }) => void;

  /* Responder */
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

  /* Emergency */
  'panic-button': (data: {
    driverId: string;
    location: Coordinates;
    timestamp: Date;
  }) => void;

  'cancel-emergency': (incidentId: string) => void;

  /* Connection */
  'driver-connect': (driverId: string) => void;
  'hospital-connect': (hospitalId: string) => void;
  'responder-connect': (responderId: string) => void;
  'disconnect': () => void;
}

/* ================= SOCKET STATE ================= */

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

/* ================= SOCKET CONFIG ================= */

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