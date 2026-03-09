// src/api/socket.ts
// Socket.io client — real-time incident updates, responder tracking, notifications

import { io, Socket } from 'socket.io-client';
import { tokenStorage } from './client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// ─── Event Types ──────────────────────────────────────────────────────────────

export interface IncidentCreatedEvent {
  incidentId: string;
  severity: string;
  location: { coordinates: [number, number] };
  driverName: string;
}

export interface ResponderLocationEvent {
  incidentId: string;
  responderId: string;
  location: { lat: number; lng: number };
  eta: number;
}

export interface IncidentStatusEvent {
  incidentId: string;
  status: string;
  updatedAt: string;
}

export interface IncidentAssignedEvent {
  incidentId: string;
  responderId: string;
  eta: number;
}

// ─── Socket Manager ───────────────────────────────────────────────────────────

class SocketManager {
  private socket: Socket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      auth: { token: tokenStorage.getAccessToken() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.disconnect();
    this.socket = null;
  }

  get instance(): Socket | null {
    return this.socket;
  }

  // ─── Room Helpers ──────────────────────────────────────────────────────────

  joinIncidentRoom(incidentId: string) {
    this.socket?.emit('join-incident', incidentId);
  }

  leaveIncidentRoom(incidentId: string) {
    this.socket?.emit('leave-incident', incidentId);
  }

  joinHospitalRoom(hospitalId: string) {
    this.socket?.emit('join-hospital', hospitalId);
  }

  connectAsResponder(responderId: string) {
    this.socket?.emit('responder-connect', responderId);
  }

  // ─── Event Subscriptions ───────────────────────────────────────────────────

  onIncidentCreated(cb: (data: IncidentCreatedEvent) => void) {
    this.socket?.on('incident-created', cb);
    return () => this.socket?.off('incident-created', cb);
  }

  onIncidentUpdated(cb: (data: IncidentStatusEvent) => void) {
    this.socket?.on('incident-updated', cb);
    return () => this.socket?.off('incident-updated', cb);
  }

  onResponderLocation(cb: (data: ResponderLocationEvent) => void) {
    this.socket?.on('driver-location-update', cb);
    return () => this.socket?.off('driver-location-update', cb);
  }

  onIncidentAssigned(cb: (data: IncidentAssignedEvent) => void) {
    this.socket?.on('incident-assigned', cb);
    return () => this.socket?.off('incident-assigned', cb);
  }

  onResponderArrived(cb: (data: { incidentId: string; responderId: string }) => void) {
    this.socket?.on('responder-arrived', cb);
    return () => this.socket?.off('responder-arrived', cb);
  }
}

export const socketManager = new SocketManager();

// ─── React Hook ───────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';

export function useSocket(autoConnect = true) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;
    socketRef.current = socketManager.connect();
    return () => {
      // Don't disconnect on unmount — keep connection alive across pages
      // Call socketManager.disconnect() explicitly on logout
    };
  }, [autoConnect]);

  return socketManager;
}

// Hook: watch live responder location updates for an incident
export function useResponderTracking(
  incidentId: string | null,
  onUpdate: (data: ResponderLocationEvent) => void
) {
  useEffect(() => {
    if (!incidentId) return;
    socketManager.connect();
    socketManager.joinIncidentRoom(incidentId);
    const unsub = socketManager.onResponderLocation(onUpdate);
    return () => {
      unsub();
      socketManager.leaveIncidentRoom(incidentId);
    };
  }, [incidentId, onUpdate]);
}

// Hook: hospital listens for new incidents
export function useNewIncidentAlerts(
  hospitalId: string | null,
  onNew: (data: IncidentCreatedEvent) => void
) {
  useEffect(() => {
    if (!hospitalId) return;
    socketManager.connect();
    socketManager.joinHospitalRoom(hospitalId);
    const unsub = socketManager.onIncidentCreated(onNew);
    return () => unsub();
  }, [hospitalId, onNew]);
}
