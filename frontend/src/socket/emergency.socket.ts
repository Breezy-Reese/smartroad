import { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../../types/socket.types';

export class EmergencySocket {
  constructor(private socket: Socket<ServerToClientEvents, ClientToServerEvents>) {}

  // Emit events
  reportIncident(data: Parameters<ClientToServerEvents['report-incident']>[0]) {
    this.socket.emit('report-incident', data);
  }

  confirmIncident(incidentId: string) {
    this.socket.emit('confirm-incident', incidentId);
  }

  acceptIncident(data: Parameters<ClientToServerEvents['accept-incident']>[0]) {
    this.socket.emit('accept-incident', data);
  }

  panicButton(data: Parameters<ClientToServerEvents['panic-button']>[0]) {
    this.socket.emit('panic-button', data);
  }

  cancelEmergency(incidentId: string) {
    this.socket.emit('cancel-emergency', incidentId);
  }

  // Listen for events
  onNewIncident(handler: ServerToClientEvents['new-incident']) {
    this.socket.on('new-incident', handler);
  }

  onIncidentUpdate(handler: ServerToClientEvents['incident-update']) {
    this.socket.on('incident-update', handler);
  }

  onResponderAccepted(handler: ServerToClientEvents['responder-accepted']) {
    this.socket.on('responder-accepted', handler);
  }

  onEmergencyAlert(handler: ServerToClientEvents['emergency-alert']) {
    this.socket.on('emergency-alert', handler);
  }

  // Remove listeners
  offNewIncident(handler?: ServerToClientEvents['new-incident']) {
    this.socket.off('new-incident', handler);
  }

  offIncidentUpdate(handler?: ServerToClientEvents['incident-update']) {
    this.socket.off('incident-update', handler);
  }
}