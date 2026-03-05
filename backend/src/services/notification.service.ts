import { io } from '../utils/socket';
import { sendSMS } from './sms.service';
import { sendEmail } from './email.service';
import { IIncident } from '../types/incident.types';
import { IEmergencyContact } from '../types/user.types';
import { logger } from '../utils/logger';

class NotificationService {
  async notifyEmergencyContacts(
    contacts: IEmergencyContact[],
    incident: IIncident
  ): Promise<void> {
    const message = this.formatEmergencyMessage(incident);

    for (const contact of contacts) {
      try {
        // Send SMS
        if (contact.phone) {
          await sendSMS({
            to: contact.phone,
            message: `EMERGENCY ALERT: ${message}`,
          });
        }

        // Send Email
        if (contact.email) {
          await sendEmail({
            to: contact.email,
            subject: '🚨 Emergency Alert - Your Contact Needs Help',
            template: 'emergency-contact',
            data: {
              contactName: contact.name,
              driverName: incident.driverName,
              location: incident.locationAddress || `${incident.location.lat}, ${incident.location.lng}`,
              severity: incident.severity,
              time: new Date(incident.timestamp).toLocaleString(),
              incidentId: incident.incidentId,
            },
          });
        }

        // Mark as notified
        contact.isNotified = true;
        
        logger.info(`Emergency contact ${contact.name} notified successfully`);
      } catch (error) {
        logger.error(`Failed to notify contact ${contact.name}:`, error);
      }
    }
  }

  async sendEmergencySMS(data: { to: string; message: string }): Promise<void> {
    try {
      await sendSMS(data);
      logger.info(`Emergency SMS sent to ${data.to}`);
    } catch (error) {
      logger.error('Failed to send emergency SMS:', error);
    }
  }

  async sendEmergencyEmail(data: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<void> {
    try {
      await sendEmail(data);
      logger.info(`Emergency email sent to ${data.to}`);
    } catch (error) {
      logger.error('Failed to send emergency email:', error);
    }
  }

  async notifyHospital(
    hospitalId: string,
    incident: IIncident
  ): Promise<void> {
    try {
      // Emit socket event
      io.to(`hospital-${hospitalId}`).emit('emergency-alert', {
        incidentId: incident._id,
        driverName: incident.driverName,
        location: incident.location,
        severity: incident.severity,
        timestamp: incident.timestamp,
      });

      logger.info(`Hospital ${hospitalId} notified of incident ${incident.incidentId}`);
    } catch (error) {
      logger.error('Failed to notify hospital:', error);
    }
  }

  async notifyResponder(
    responderId: string,
    incident: IIncident,
    eta: number
  ): Promise<void> {
    try {
      io.to(`responder-${responderId}`).emit('incident-assigned', {
        incidentId: incident._id,
        location: incident.location,
        driverName: incident.driverName,
        severity: incident.severity,
        eta,
      });

      logger.info(`Responder ${responderId} notified of incident ${incident.incidentId}`);
    } catch (error) {
      logger.error('Failed to notify responder:', error);
    }
  }

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
    } catch (error) {
      logger.error('Failed to notify driver:', error);
    }
  }

  async broadcastToHospitals(
    incident: IIncident,
    hospitalIds?: string[]
  ): Promise<void> {
    try {
      const event = 'emergency-broadcast';
      const data = {
        incidentId: incident._id,
        driverName: incident.driverName,
        location: incident.location,
        severity: incident.severity,
        timestamp: incident.timestamp,
      };

      if (hospitalIds && hospitalIds.length > 0) {
        // Broadcast to specific hospitals
        hospitalIds.forEach(id => {
          io.to(`hospital-${id}`).emit(event, data);
        });
      } else {
        // Broadcast to all hospitals
        io.emit(event, data);
      }

      logger.info(`Emergency broadcast sent for incident ${incident.incidentId}`);
    } catch (error) {
      logger.error('Failed to broadcast to hospitals:', error);
    }
  }

  async sendPanicAlert(
    driverId: string,
    driverName: string,
    location: { lat: number; lng: number }
  ): Promise<void> {
    try {
      const message = `PANIC ALERT: ${driverName} has triggered panic button at ${location.lat},${location.lng}`;

      // Broadcast to all hospitals
      io.emit('panic-alert', {
        driverId,
        driverName,
        location,
        timestamp: new Date(),
      });

      // Send SMS to emergency services
      await this.sendEmergencySMS({
        to: process.env.EMERGENCY_PHONE_NUMBER || '911',
        message,
      });

      logger.info(`Panic alert sent for driver ${driverName}`);
    } catch (error) {
      logger.error('Failed to send panic alert:', error);
    }
  }

  async sendIncidentUpdate(
    incident: IIncident,
    updateType: 'status' | 'responder' | 'location'
  ): Promise<void> {
    try {
      // Notify driver
      if (incident.driverId) {
        io.to(`driver-${incident.driverId}`).emit('incident-update', {
          incidentId: incident._id,
          updateType,
          data: incident,
        });
      }

      // Notify hospital
      if (incident.hospitalId) {
        io.to(`hospital-${incident.hospitalId}`).emit('incident-update', incident);
      }

      // Notify responders
      incident.responders.forEach(responder => {
        io.to(`responder-${responder.id}`).emit('incident-update', incident);
      });

      logger.info(`Incident update sent for ${incident.incidentId}`);
    } catch (error) {
      logger.error('Failed to send incident update:', error);
    }
  }

  private formatEmergencyMessage(incident: IIncident): string {
    const severity = incident.severity.toUpperCase();
    const location = incident.locationAddress || 
      `Lat: ${incident.location.lat.toFixed(6)}, Lng: ${incident.location.lng.toFixed(6)}`;
    
    return `${incident.driverName} has been in a ${severity} severity accident at ${location}. Immediate assistance required.`;
  }
}

export const notificationService = new NotificationService();