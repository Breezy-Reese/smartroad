import { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../../types/socket.types';
import { DriverLocation } from '../../types/location.types';

export class LocationSocket {
  constructor(private socket: Socket<ServerToClientEvents, ClientToServerEvents>) {}

  // Emit events
  updateLocation(data: DriverLocation) {
    this.socket.emit('location-update', data);
  }

  startTracking(driverId: string) {
    this.socket.emit('start-tracking', driverId);
  }

  stopTracking(driverId: string) {
    this.socket.emit('stop-tracking', driverId);
  }

  // Listen for events
  onLocationUpdate(handler: ServerToClientEvents['location-update']) {
    this.socket.on('location-update', handler);
  }

  onDriverStatusChange(handler: ServerToClientEvents['driver-status-change']) {
    this.socket.on('driver-status-change', handler);
  }

  // Remove listeners
  offLocationUpdate(handler?: ServerToClientEvents['location-update']) {
    this.socket.off('location-update', handler);
  }

  offDriverStatusChange(handler?: ServerToClientEvents['driver-status-change']) {
    this.socket.off('driver-status-change', handler);
  }
}