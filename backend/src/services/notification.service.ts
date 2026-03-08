import { io } from '../utils/socket';
import { sendSMS } from './sms.service';
import { emailService } from './email.service';
import { logger } from '../utils/logger';

import { IncidentDocument } from '../types/incident.types';
import { IEmergencyContact } from '../types/user.types';

class NotificationService {
  sendEmergencySMS(arg0: { to: string; message: string; }) {
    throw new Error('Method not implemented.');
  }
  // ================= EMERGENCY CONTACTS =================

  async notifyEmergencyContacts(
    contacts: IEmergencyContact[],
    incident: IncidentDocument
  ): Promise<void> {
    const message = this.formatEmergencyMessage(incident);

    for (const contact of contacts) {
      try {
        if (contact.phone) {
          await sendSMS({
            to: contact.phone,
            message: `🚨 EMERGENCY: ${message}`,
          });
        }

        if (contact.email) {
          await emailService.sendEmail({
            to: contact.email,
            subject: '🚨 Emergency Alert - Immediate Attention Required',
            template: 'emergency-contact',
            data: {
              contactName: contact.name,
              driverName: incident.driverName,
              location:
                incident.locationAddress ||
                `${incident.location.lat}, ${incident.location.lng}`,
              severity: incident.severity,
              incidentId: incident.incidentId,
              time: new Date(incident.timestamp).toLocaleString(),
            },
          });
        }

        contact.isNotified = true;

        logger.info(`Notified emergency contact: ${contact.name}`);
      } catch (error) {
        logger.error(`Failed to notify ${contact.name}`, error);
      }
    }
  }

  // ================= HOSPITAL NOTIFICATION =================

  async notifyHospital(
    hospitalId: string,
    incident: IncidentDocument
  ): Promise<void> {
    try {
      io.to(`hospital-${hospitalId}`).emit('emergency-alert', {
        incidentId: incident._id,
        driverName: incident.driverName,
        location: incident.location,
        severity: incident.severity,
        timestamp: incident.timestamp,
      });

      logger.info(`Hospital ${hospitalId} notified`);
    } catch (error) {
      logger.error('Hospital notification failed', error);
    }
  }

  // ================= RESPONDER NOTIFICATION =================

  async notifyResponder(
    responderId: string,
    incident: IncidentDocument,
    eta: number
  ): Promise<void> {
    try {
      io.to(`responder-${responderId}`).emit('incident-assigned', {
        incidentId: incident._id,
        driverName: incident.driverName,
        location: incident.location,
        severity: incident.severity,
        eta,
      });

      logger.info(`Responder ${responderId} notified`);
    } catch (error) {
      logger.error('Responder notification failed', error);
    }
  }

  // ================= DRIVER NOTIFICATION =================

  async notifyDriver(
    driverId: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      io.to(`driver-${driverId}`).emit('driver-notification', {
        message,
        ...data,
        timestamp: new Date(),
      });

      logger.info(`Driver ${driverId} notified`);
    } catch (error) {
      logger.error('Driver notification failed', error);
    }
  }

  // ================= BROADCAST =================

  async broadcastToHospitals(
    incident: IncidentDocument,
    hospitalIds?: string[]
  ): Promise<void> {
    try {
      const payload = {
        incidentId: incident._id,
        driverName: incident.driverName,
        location: incident.location,
        severity: incident.severity,
        timestamp: incident.timestamp,
      };

      if (hospitalIds?.length) {
        hospitalIds.forEach(id =>
          io.to(`hospital-${id}`).emit('emergency-broadcast', payload)
        );
      } else {
        io.emit('emergency-broadcast', payload);
      }

      logger.info(`Broadcast sent for incident ${incident.incidentId}`);
    } catch (error) {
      logger.error('Broadcast failed', error);
    }
  }

  // ================= PANIC BUTTON =================

  async sendPanicAlert(
    driverId: string,
    driverName: string,
    location: { lat: number; lng: number }
  ): Promise<void> {
    try {
      const message = `PANIC ALERT: ${driverName} triggered panic at ${location.lat},${location.lng}`;

      io.emit('panic-alert', {
        driverId,
        driverName,
        location,
        timestamp: new Date(),
      });

      await sendSMS({
        to: process.env.EMERGENCY_PHONE_NUMBER || '911',
        message,
      });

      logger.info(`Panic alert sent for ${driverName}`);
    } catch (error) {
      logger.error('Panic alert failed', error);
    }
  }

  // ================= INCIDENT UPDATE =================

  async sendIncidentUpdate(
    incident: IncidentDocument,
    updateType: 'status' | 'responder' | 'location'
  ): Promise<void> {
    try {
      if (incident.driverId) {
        io.to(`driver-${incident.driverId}`).emit('incident-update', {
          incidentId: incident._id,
          updateType,
          data: incident,
        });
      }

      if (incident.hospitalId) {
        io.to(`hospital-${incident.hospitalId}`).emit(
          'incident-update',
          incident
        );
      }

      incident.responders?.forEach((responder: any) => {
        if (responder?.id) {
          io.to(`responder-${responder.id}`).emit(
            'incident-update',
            incident
          );
        }
      });

      logger.info(`Incident update sent for ${incident.incidentId}`);
    } catch (error) {
      logger.error('Incident update failed', error);
    }
  }

  // ================= HELPERS =================

  private formatEmergencyMessage(incident: IncidentDocument): string {
    const severity = incident.severity.toUpperCase();

    const location = incident.locationAddress
      ? incident.locationAddress
      : `Lat: ${incident.location.lat.toFixed(
          6
        )}, Lng: ${incident.location.lng.toFixed(6)}`;

    return `${incident.driverName} reported a ${severity} accident at ${location}. Immediate response required.`;
  }
}

export const notificationService = new NotificationService();