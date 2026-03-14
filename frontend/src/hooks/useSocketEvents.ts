import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { Incident, EmergencyAlert } from '../types/emergency.types';
import { DriverLocation, ResponderLocation } from '../types/location.types';

export interface SocketEventHandlers {
  // Incidents
  onNewIncident?: (incident: Incident) => void;
  onIncidentUpdated?: (incident: Incident) => void;
  onIncidentResolved?: (incidentId: string) => void;
  onIncidentCancelled?: (incidentId: string) => void;

  // Emergency
  onEmergencyAlert?: (alert: EmergencyAlert) => void;
  onPanicAlert?: (data: {
    driverId: string;
    driverName: string;
    location: { latitude: number; longitude: number };
    timestamp: Date;
  }) => void;

  // Location
  onLocationUpdate?: (data: DriverLocation) => void;
  onResponderLocation?: (data: ResponderLocation) => void;

  // Driver status
  onDriverStatusChange?: (data: {
    driverId: string;
    status: 'online' | 'offline' | 'driving' | 'emergency';
    location?: { latitude: number; longitude: number };
  }) => void;

  // Responders
  onResponderAccepted?: (data: {
    incidentId: string;
    responder: import('../types/emergency.types').ResponderInfo;
    hospitalId: string;
  }) => void;
  onResponderUpdate?: (data: {
    incidentId: string;
    responders: import('../types/emergency.types').ResponderInfo[];
  }) => void;

  // Hospital
  onHospitalStatsUpdate?: (data: { hospitalId: string; stats: any }) => void;

  // System
  onSystemNotification?: (data: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timeout?: number;
  }) => void;
}

/**
 * useSocketEvents
 *
 * Attach socket event handlers declaratively from any component.
 * Handlers are stored in refs so changing a callback never
 * causes the effect to re-run and re-register listeners.
 *
 * Usage:
 *   useSocketEvents({
 *     onNewIncident: (incident) => dispatch(addIncident(incident)),
 *     onEmergencyAlert: (alert) => showToast(alert),
 *   });
 */
export const useSocketEvents = (handlers: SocketEventHandlers) => {
  const { on, off } = useSocket();

  // Keep latest handlers in refs — avoids stale closures without re-subscribing
  const refs = useRef(handlers);
  useEffect(() => {
    refs.current = handlers;
  });

  useEffect(() => {
    // ── Incidents ────────────────────────────────────────────────
    const onNewIncident = (incident: Incident) =>
      refs.current.onNewIncident?.(incident);

    const onIncidentUpdated = (incident: Incident) =>
      refs.current.onIncidentUpdated?.(incident);

    const onIncidentResolved = (incidentId: string) =>
      refs.current.onIncidentResolved?.(incidentId);

    const onIncidentCancelled = (incidentId: string) =>
      refs.current.onIncidentCancelled?.(incidentId);

    // ── Emergency ─────────────────────────────────────────────────
    const onEmergencyAlert = (alert: EmergencyAlert) =>
      refs.current.onEmergencyAlert?.(alert);

    const onPanicAlert = (data: {
      driverId: string;
      driverName: string;
      location: { latitude: number; longitude: number };
      timestamp: Date;
    }) => refs.current.onPanicAlert?.(data);

    // ── Location ──────────────────────────────────────────────────
    const onLocationUpdate = (data: DriverLocation) =>
      refs.current.onLocationUpdate?.(data);

    const onResponderLocation = (data: ResponderLocation) =>
      refs.current.onResponderLocation?.(data);

    // ── Driver status ─────────────────────────────────────────────
    const onDriverStatusChange = (data: {
      driverId: string;
      status: 'online' | 'offline' | 'driving' | 'emergency';
      location?: { latitude: number; longitude: number };
    }) => refs.current.onDriverStatusChange?.(data);

    // ── Responders ────────────────────────────────────────────────
    const onResponderAccepted = (data: {
      incidentId: string;
      responder: import('../types/emergency.types').ResponderInfo;
      hospitalId: string;
    }) => refs.current.onResponderAccepted?.(data);

    const onResponderUpdate = (data: {
      incidentId: string;
      responders: import('../types/emergency.types').ResponderInfo[];
    }) => refs.current.onResponderUpdate?.(data);

    // ── Hospital ──────────────────────────────────────────────────
    const onHospitalStatsUpdate = (data: { hospitalId: string; stats: any }) =>
      refs.current.onHospitalStatsUpdate?.(data);

    // ── System ────────────────────────────────────────────────────
    const onSystemNotification = (data: {
      type: 'info' | 'warning' | 'error' | 'success';
      title: string;
      message: string;
      timeout?: number;
    }) => refs.current.onSystemNotification?.(data);

    // Register all listeners
    on('new-incident',          onNewIncident);
    on('incident-update',       onIncidentUpdated);
    on('incident-resolved',     onIncidentResolved);
    on('incident-cancelled',    onIncidentCancelled);
    on('emergency-alert',       onEmergencyAlert);
    on('panic-alert',           onPanicAlert);
    on('location-update',       onLocationUpdate);
    on('responder-location',    onResponderLocation);
    on('driver-status-change',  onDriverStatusChange);
    on('responder-accepted',    onResponderAccepted);
    on('responder-update',      onResponderUpdate);
    on('hospital-stats-update', onHospitalStatsUpdate);
    on('system-notification',   onSystemNotification);

    return () => {
      off('new-incident',          onNewIncident);
      off('incident-update',       onIncidentUpdated);
      off('incident-resolved',     onIncidentResolved);
      off('incident-cancelled',    onIncidentCancelled);
      off('emergency-alert',       onEmergencyAlert);
      off('panic-alert',           onPanicAlert);
      off('location-update',       onLocationUpdate);
      off('responder-location',    onResponderLocation);
      off('driver-status-change',  onDriverStatusChange);
      off('responder-accepted',    onResponderAccepted);
      off('responder-update',      onResponderUpdate);
      off('hospital-stats-update', onHospitalStatsUpdate);
      off('system-notification',   onSystemNotification);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, off]);
};
