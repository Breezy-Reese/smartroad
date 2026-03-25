import { io } from '../utils/socket';
import { sendSMS } from './sms.service';
import { emailService } from './email.service';
import { logger } from '../utils/logger';

import { IIncident } from '../types/incident.types';
import { IEmergencyContact } from '../types/user.types';

// Helper: safely extract human-readable location string from an incident.
// The model stores location as GeoJSON { type: 'Point', coordinates: [lng, lat] }
// — NOT as { lat, lng }. Falls back gracefully when location is not yet set.
function formatLocation(incident: IIncident): string {
  if (incident.locationAddress) return incident.locationAddress;

  const coords = incident.location?.coordinates;
  if (coords?.length === 2) {
    const lat = coords[1].toFixed(6);
    const lng = coords[0].toFixed(6);
    return `Lat: ${lat}, Lng: ${lng}`;
  }

  return 'Location pending GPS';
}

// Helper: check whether SMS is actually configured before attempting a send.
// Twilio credentials missing → skip silently rather than hanging 23s on timeout.
function isSmsEnabled(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

class NotificationService {
  // ================= EMERGENCY CONTACTS =================

  async notifyEmergencyContacts(
    contacts: IEmergencyContact[],
    incident: IIncident,
  ): Promise<void> {
    const message = this.formatEmergencyMessage(incident);

    for (const contact of contacts) {
      try {
        // Only attempt SMS when Twilio is configured — avoids 23s timeout
        if (contact.phone && isSmsEnabled()) {
          await sendSMS({
            to:      contact.phone,
            message: `🚨 EMERGENCY: ${message}`,
          });
        } else if (contact.phone) {
          logger.debug(`SMS skipped for ${contact.name} — Twilio not configured`);
        }

        if (contact.email) {
          await emailService.sendEmail({
            to:       contact.email,
            subject:  '🚨 Emergency Alert - Immediate Attention Required',
            template: 'emergency-contact',
            data: {
              contactName: contact.name,
              driverName:  incident.driverName,
              location:    formatLocation(incident),
              severity:    incident.severity,
              incidentId:  incident.incidentId,
              time:        new Date(incident.timestamp).toLocaleString(),
            },
          });
        }

        contact.isNotified = true;
        logger.info(`Notified emergency contact: ${contact.name}`);
      } catch (error) {
        // Never let one failed contact block the rest
        logger.error(`Failed to notify ${contact.name}:`, error);
      }
    }
  }

  // ================= EMERGENCY SMS (direct call) =================

  async sendEmergencySMS(arg0: { to: string; message: string }): Promise<void> {
    if (!isSmsEnabled()) {
      logger.debug('sendEmergencySMS skipped — Twilio not configured');
      return;
    }
    try {
      await sendSMS(arg0);
    } catch (error) {
      logger.error('sendEmergencySMS failed:', error);
    }
  }

  // ================= HOSPITAL NOTIFICATION =================

  async notifyHospital(hospitalId: string, incident: IIncident): Promise<void> {
    try {
      io.to(`hospital-${hospitalId}`).emit('emergency-alert', {
        incidentId: incident._id,
        driverName: incident.driverName,
        location:   incident.location,
        severity:   incident.severity,
        timestamp:  incident.timestamp,
      });

      logger.info(`Hospital ${hospitalId} notified`);
    } catch (error) {
      logger.error('Hospital notification failed:', error);
    }
  }

  // ================= RESPONDER NOTIFICATION =================

  async notifyResponder(
    responderId: string,
    incident:    IIncident,
    eta:         number,
  ): Promise<void> {
    try {
      io.to(`responder-${responderId}`).emit('incident-assigned', {
        incidentId: incident._id,
        driverName: incident.driverName,
        location:   incident.location,
        severity:   incident.severity,
        eta,
      });

      logger.info(`Responder ${responderId} notified`);
    } catch (error) {
      logger.error('Responder notification failed:', error);
    }
  }

  // ================= DRIVER NOTIFICATION =================

  async notifyDriver(driverId: string, message: string, data?: any): Promise<void> {
    try {
      io.to(`driver-${driverId}`).emit('driver-notification', {
        message,
        ...data,
        timestamp: new Date(),
      });

      logger.info(`Driver ${driverId} notified`);
    } catch (error) {
      logger.error('Driver notification failed:', error);
    }
  }

  // ================= BROADCAST =================

  async broadcastToHospitals(incident: IIncident, hospitalIds?: string[]): Promise<void> {
    try {
      const payload = {
        incidentId: incident._id,
        driverName: incident.driverName,
        location:   incident.location,
        severity:   incident.severity,
        timestamp:  incident.timestamp,
      };

      if (hospitalIds?.length) {
        hospitalIds.forEach((id) =>
          io.to(`hospital-${id}`).emit('emergency-broadcast', payload),
        );
      } else {
        io.emit('emergency-broadcast', payload);
      }

      logger.info(`Broadcast sent for incident ${incident.incidentId}`);
    } catch (error) {
      logger.error('Broadcast failed:', error);
    }
  }

  // ================= PANIC BUTTON =================

  async sendPanicAlert(
    driverId:   string,
    driverName: string,
    location:   { lat: number; lng: number },
  ): Promise<void> {
    try {
      const message = `PANIC ALERT: ${driverName} triggered panic at ${location.lat},${location.lng}`;

      io.emit('panic-alert', { driverId, driverName, location, timestamp: new Date() });

      // Only call SMS when configured
      if (isSmsEnabled()) {
        await sendSMS({
          to:      process.env.EMERGENCY_PHONE_NUMBER || '911',
          message,
        });
      } else {
        logger.debug('Panic SMS skipped — Twilio not configured');
      }

      logger.info(`Panic alert sent for ${driverName}`);
    } catch (error) {
      logger.error('Panic alert failed:', error);
    }
  }

  // ================= INCIDENT UPDATE =================

  async sendIncidentUpdate(
    incident:   IIncident,
    updateType: 'status' | 'responder' | 'location',
  ): Promise<void> {
    try {
      if (incident.driverId) {
        io.to(`driver-${incident.driverId}`).emit('incident-update', {
          incidentId: incident._id,
          updateType,
          data:       incident,
        });
      }

      if (incident.hospitalId) {
        io.to(`hospital-${incident.hospitalId}`).emit('incident-update', incident);
      }

      incident.responders?.forEach((responder: any) => {
        if (responder?.responderId) {
          io.to(`responder-${responder.responderId}`).emit('incident-update', incident);
        }
      });

      logger.info(`Incident update sent for ${incident.incidentId}`);
    } catch (error) {
      logger.error('Incident update failed:', error);
    }
  }

  // ================= HELPERS =================

  private formatEmergencyMessage(incident: IIncident): string {
    const severity = incident.severity.toUpperCase();
    const location = formatLocation(incident);
    return `${incident.driverName} reported a ${severity} accident at ${location}. Immediate response required.`;
  }
}

export const notificationService = new NotificationService();