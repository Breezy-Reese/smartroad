import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { ResponderStatus } from '../models/ResponderStatus.model';
import { locationService } from './location.service';
import { notificationService } from './notification.service';
import { logger } from '../utils/logger';
import { ICoordinates, IUser } from '../types';

class ResponderService {
  // =====================================================
  // AUTO DISPATCH (stub if needed)
  // =====================================================
  autoDispatch(_responderId: string, _location: ICoordinates) {
    throw new Error('Method not implemented.');
  }

  // =====================================================
  // ASSIGN RESPONDER
  // =====================================================
  async assignResponder(
    incidentId: string,
    hospitalId: string
  ): Promise<{ responder: IUser; eta: number; distance: number }> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) throw new Error('Incident not found');

      const responder = await this.findNearestAvailableResponder(
        hospitalId,
        {
          lat: incident.location.coordinates[1],
          lng: incident.location.coordinates[0],
        }
      );

      if (!responder) throw new Error('No available responders found');

      const responderStatus = await ResponderStatus.findOne({
        responderId: responder._id,
      });
      if (!responderStatus) throw new Error('Responder status not found');

      const eta = locationService.calculateETA(
        {
          lat: responderStatus.currentLocation.coordinates[1],
          lng: responderStatus.currentLocation.coordinates[0],
        },
        {
          lat: incident.location.coordinates[1],
          lng: incident.location.coordinates[0],
        }
      );

      const distance = locationService.calculateDistance(
        {
          lat: responderStatus.currentLocation.coordinates[1],
          lng: responderStatus.currentLocation.coordinates[0],
        },
        {
          lat: incident.location.coordinates[1],
          lng: incident.location.coordinates[0],
        }
      );

 // FIXED: Match the ResponderSchema structure from the model
const responderInfo = {
  responderId: responder._id,
  name: responder.name || '',
  type: (responder.responderType as 'ambulance' | 'police' | 'fire' | 'rescue') || 'ambulance',
  hospital: hospitalId,
  eta,
  distance,
  status: 'dispatched',
  location: {
    lat: incident.location.coordinates[1],
    lng: incident.location.coordinates[0],
  },
  contactNumber: responder.phone,
  dispatchedAt: new Date(),
};

incident.responders.push(responderInfo as any);
incident.status = 'dispatched';
await incident.save();

responderStatus.isAvailable = false;
responderStatus.currentIncidentId = incident._id;
responderStatus.status = 'en-route';
await responderStatus.save();

// Convert incident to plain object for notification
const incidentObject = (incident as any).toObject();

await notificationService.notifyResponder(String(responder._id), incidentObject, eta);
await notificationService.notifyDriver(
  String(incident.driverId), 
  'A responder has been dispatched', 
  { responder: responderInfo }
);

      logger.info(`Responder ${responder.name} assigned to incident ${incident.incidentId}`);

      return { responder, eta, distance };
    } catch (error) {
      logger.error('Assign responder error:', error);
      throw error;
    }
  }

  // =====================================================
  // UPDATE RESPONDER LOCATION
  // =====================================================
  async updateResponderLocation(responderId: string, location: ICoordinates): Promise<void> {
    try {
      const responderStatus = await ResponderStatus.findOneAndUpdate(
        { responderId },
        {
          currentLocation: {
            type: 'Point',
            coordinates: [location.lng, location.lat],
          },
          lastUpdate: new Date(),
        },
        { new: true, upsert: true }
      );

      if (!responderStatus?.currentIncidentId) return;

      const incident = await Incident.findById(responderStatus.currentIncidentId);
      if (!incident) return;

      const eta = locationService.calculateETA(location, {
        lat: incident.location.coordinates[1],
        lng: incident.location.coordinates[0],
      });

      const index = incident.responders.findIndex(r => r.responderId.toString() === responderId);

      if (index !== -1) {
        incident.responders[index].eta = eta;
        incident.responders[index].location = location;
        await incident.save();

        await notificationService.notifyDriver(
          String(incident.driverId), 
          `Responder ETA updated to ${eta} minutes`, 
          { responderId, eta }
        );
      }

      logger.info(`Responder ${responderId} location updated`);
    } catch (error) {
      logger.error('Update responder location error:', error);
      throw error;
    }
  }

  // =====================================================
  // UPDATE RESPONDER STATUS
  // =====================================================
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

      if (status === 'available' && responderStatus) {
        responderStatus.currentIncidentId = undefined;
        await responderStatus.save();
      }

      logger.info(`Responder ${responderId} status updated to ${status}`);
    } catch (error) {
      logger.error('Update responder status error:', error);
      throw error;
    }
  }

  // =====================================================
  // FIND NEAREST AVAILABLE RESPONDER
  // =====================================================
  async findNearestAvailableResponder(hospitalId: string, location: ICoordinates): Promise<IUser | null> {
    try {
      const responders = await User.find({
        role: 'responder',
        hospitalId,
        isActive: true,
      }).lean();

      if (!responders.length) return null;

      const responderIds = responders.map(r => r._id);
      
      const statuses = await ResponderStatus.find({
        responderId: { $in: responderIds },
        isAvailable: true,
      }).lean();

      if (!statuses.length) return null;

      let nearest: IUser | null = null;
      let minDistance = Infinity;

      for (const status of statuses) {
        const distance = locationService.calculateDistance(location, {
          lat: status.currentLocation.coordinates[1],
          lng: status.currentLocation.coordinates[0],
        });
        if (distance < minDistance) {
          minDistance = distance;
          const responder = responders.find(r => 
            String(r._id) === String(status.responderId)
          );
          if (responder) {
            nearest = responder as unknown as IUser;
          }
        }
      }

      return nearest;
    } catch (error) {
      logger.error('Find nearest responder error:', error);
      throw error;
    }
  }

  // =====================================================
  // RESPONDER DASHBOARD
  // =====================================================
  async getResponderDashboard(responderId: string) {
    try {
      const responder = await User.findById(responderId).lean();
      if (!responder) throw new Error('Responder not found');

      const status = await ResponderStatus.findOne({ responderId }).lean();
      
      let currentIncident = null;
      if (status?.currentIncidentId) {
        currentIncident = await Incident.findById(status.currentIncidentId)
          .populate('driverId', 'name phone')
          .lean();
      }

      const hospital = responder.hospitalId
        ? await User.findById(responder.hospitalId).select('hospitalName location').lean()
        : null;

      return { 
        responder,
        status, 
        currentIncident, 
        hospital 
      };
    } catch (error) {
      logger.error('Responder dashboard error:', error);
      throw error;
    }
  }

  // =====================================================
  // MARK ARRIVED
  // =====================================================
  async markResponderArrived(responderId: string, incidentId: string): Promise<void> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) throw new Error('Incident not found');

      const index = incident.responders.findIndex(r => r.responderId.toString() === responderId);

      if (index !== -1) {
        incident.responders[index].status = 'arrived';
        incident.responders[index].arrivedAt = new Date();
        incident.status = 'arrived';
        await incident.save();

        await ResponderStatus.findOneAndUpdate({ responderId }, { status: 'on-scene' });
        await notificationService.notifyDriver(
          String(incident.driverId), 
          'Responder has arrived at the scene'
        );
      }

      logger.info(`Responder ${responderId} marked arrived for incident ${incidentId}`);
    } catch (error) {
      logger.error('Mark responder arrived error:', error);
      throw error;
    }
  }

  // =====================================================
  // COMPLETE INCIDENT
  // =====================================================
  async completeIncident(responderId: string, incidentId: string): Promise<void> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) throw new Error('Incident not found');

      incident.status = 'resolved';
      incident.resolvedAt = new Date();
      await incident.save();

      await ResponderStatus.findOneAndUpdate(
        { responderId },
        { isAvailable: true, status: 'available', currentIncidentId: null }
      );

      logger.info(`Responder ${responderId} completed incident ${incidentId}`);
    } catch (error) {
      logger.error('Complete incident error:', error);
      throw error;
    }
  }
}

export const responderService = new ResponderService();