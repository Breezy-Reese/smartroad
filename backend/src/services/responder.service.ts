import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { ResponderStatus } from '../models/Responder.model';
import { locationService } from './location.service';
import { notificationService } from './notification.service';
import { logger } from '../utils/logger';

class ResponderService {
  async assignResponder(
    incidentId: string,
    hospitalId: string
  ): Promise<any> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // Find nearest available responder
      const responder = await this.findNearestAvailableResponder(
        hospitalId,
        incident.location
      );

      if (!responder) {
        throw new Error('No available responders found');
      }

      // Calculate ETA
      const responderStatus = await ResponderStatus.findOne({
        responderId: responder._id,
      });

      if (!responderStatus) {
        throw new Error('Responder status not found');
      }

      const eta = locationService.calculateETA(
        responderStatus.currentLocation,
        incident.location
      );

      const distance = locationService.calculateDistance(
        responderStatus.currentLocation,
        incident.location
      );

      // Add responder to incident
      const responderInfo = {
        id: responder._id.toString(),
        name: responder.name,
        type: responder.responderType,
        hospital: hospitalId,
        eta,
        distance,
        status: 'dispatched',
        location: responderStatus.currentLocation,
        dispatchedAt: new Date(),
      };

      incident.responders.push(responderInfo);
      incident.status = 'dispatched';
      await incident.save();

      // Update responder status
      responderStatus.isAvailable = false;
      responderStatus.currentIncidentId = incident._id;
      responderStatus.status = 'en-route';
      await responderStatus.save();

      // Send notifications
      await notificationService.notifyResponder(
        responder._id.toString(),
        incident,
        eta
      );

      await notificationService.notifyDriver(
        incident.driverId.toString(),
        'A responder has been dispatched to your location',
        { responder: responderInfo }
      );

      logger.info(`Responder ${responder.name} assigned to incident ${incident.incidentId}`);

      return {
        responder,
        eta,
        distance,
      };
    } catch (error) {
      logger.error('Error assigning responder:', error);
      throw error;
    }
  }

  async updateResponderLocation(
    responderId: string,
    location: { lat: number; lng: number }
  ): Promise<void> {
    try {
      const responderStatus = await ResponderStatus.findOneAndUpdate(
        { responderId },
        {
          currentLocation: location,
          lastUpdate: new Date(),
        },
        { new: true, upsert: true }
      );

      // If responder is assigned to an incident, update ETA
      if (responderStatus.currentIncidentId) {
        const incident = await Incident.findById(responderStatus.currentIncidentId);
        if (incident) {
          const eta = locationService.calculateETA(location, incident.location);
          
          // Update responder's ETA in incident
          const responderIndex = incident.responders.findIndex(
            r => r.id === responderId
          );
          if (responderIndex !== -1) {
            incident.responders[responderIndex].eta = eta;
            incident.responders[responderIndex].location = location;
            await incident.save();

            // Notify driver of updated ETA
            await notificationService.notifyDriver(
              incident.driverId.toString(),
              `Responder ETA updated: ${eta} minutes`,
              { responderId, eta }
            );
          }
        }
      }

      logger.info(`Responder ${responderId} location updated`);
    } catch (error) {
      logger.error('Error updating responder location:', error);
      throw error;
    }
  }

  async updateResponderStatus(
    responderId: string,
    status: 'available' | 'en-route' | 'on-scene' | 'transporting' | 'off-duty'
  ): Promise<void> {
    try {
      const responderStatus = await ResponderStatus.findOneAndUpdate(
        { responderId },
        {
          status,
          isAvailable: status === 'available',
          lastUpdate: new Date(),
        },
        { new: true }
      );

      // If responder becomes available, clear incident assignment
      if (status === 'available' && responderStatus) {
        responderStatus.currentIncidentId = undefined;
        await responderStatus.save();
      }

      logger.info(`Responder ${responderId} status updated to ${status}`);
    } catch (error) {
      logger.error('Error updating responder status:', error);
      throw error;
    }
  }

  async findNearestAvailableResponder(
    hospitalId: string,
    location: { lat: number; lng: number }
  ): Promise<any> {
    try {
      // Get all available responders from this hospital
      const responders = await User.find({
        role: 'responder',
        hospitalId,
        isActive: true,
      });

      const responderIds = responders.map(r => r._id);

      // Get their current status and location
      const statuses = await ResponderStatus.find({
        responderId: { $in: responderIds },
        isAvailable: true,
      });

      if (statuses.length === 0) {
        return null;
      }

      // Find nearest
      let nearest = null;
      let minDistance = Infinity;

      for (const status of statuses) {
        const distance = locationService.calculateDistance(
          location,
          status.currentLocation
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = responders.find(
            r => r._id.toString() === status.responderId.toString()
          );
        }
      }

      return nearest;
    } catch (error) {
      logger.error('Error finding nearest responder:', error);
      throw error;
    }
  }

  async getResponderDashboard(responderId: string): Promise<any> {
    try {
      const responder = await User.findById(responderId);
      if (!responder) {
        throw new Error('Responder not found');
      }

      const status = await ResponderStatus.findOne({ responderId });

      let currentIncident = null;
      if (status?.currentIncidentId) {
        currentIncident = await Incident.findById(status.currentIncidentId)
          .populate('driverId', 'name phone');
      }

      const hospital = await User.findById(responder.hospitalId)
        .select('hospitalName location');

      return {
        responder,
        status,
        currentIncident,
        hospital,
      };
    } catch (error) {
      logger.error('Error getting responder dashboard:', error);
      throw error;
    }
  }

  async markResponderArrived(responderId: string, incidentId: string): Promise<void> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const responderIndex = incident.responders.findIndex(
        r => r.id === responderId
      );

      if (responderIndex !== -1) {
        incident.responders[responderIndex].status = 'arrived';
        incident.responders[responderIndex].arrivedAt = new Date();
        incident.status = 'arrived';
        await incident.save();

        await ResponderStatus.findOneAndUpdate(
          { responderId },
          { status: 'on-scene' }
        );

        // Notify driver
        await notificationService.notifyDriver(
          incident.driverId.toString(),
          'Responder has arrived at the scene'
        );

        logger.info(`Responder ${responderId} arrived at incident ${incidentId}`);
      }
    } catch (error) {
      logger.error('Error marking responder arrived:', error);
      throw error;
    }
  }

  async completeIncident(responderId: string, incidentId: string): Promise<void> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      incident.status = 'resolved';
      incident.resolvedAt = new Date();
      await incident.save();

      // Free up responder
      await ResponderStatus.findOneAndUpdate(
        { responderId },
        {
          isAvailable: true,
          status: 'available',
          currentIncidentId: null,
        }
      );

      logger.info(`Responder ${responderId} completed incident ${incidentId}`);
    } catch (error) {
      logger.error('Error completing incident:', error);
      throw error;
    }
  }
}

export const responderService = new ResponderService();