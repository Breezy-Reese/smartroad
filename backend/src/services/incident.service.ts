import { Incident } from '../models/Incident.model';
import { User } from '../models/User.model';
import { Location } from '../models/Location.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/Responder.model';
import { notificationService } from './notification.service';
import { locationService } from './location.service';
import { responderService } from './responder.service';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis.config';
import {
  IIncident,
  ICreateIncidentDTO,
  IUpdateIncidentDTO,
  IAcceptIncidentDTO,
  IncidentStatus,
  IncidentSeverity,
} from '../types/incident.types';
import { ICoordinates } from '../types/user.types';

class IncidentService {
  private readonly INCIDENT_CACHE_TTL = 300; // 5 minutes
  private readonly SEVERITY_THRESHOLDS = {
    critical: { impactForce: 15, speed: 80 },
    high: { impactForce: 10, speed: 60 },
    medium: { impactForce: 5, speed: 40 },
    low: { impactForce: 2, speed: 20 },
  };

  async createIncident(incidentData: ICreateIncidentDTO, driverId: string): Promise<IIncident> {
    try {
      // Get driver details
      const driver = await User.findById(driverId);
      if (!driver) {
        throw new Error('Driver not found');
      }

      // Calculate severity if not provided
      let severity = incidentData.severity;
      if (!severity && incidentData.impactForce) {
        severity = this.calculateSeverity(
          incidentData.impactForce,
          incidentData.speed || 0,
          incidentData.airbagDeployed || false
        );
      }

      // Create incident
      const incident = new Incident({
        ...incidentData,
        driverId,
        driverName: driver.name,
        driverPhone: driver.phone,
        severity: severity || 'medium',
        detectedAt: new Date(),
        emergencyContacts: driver.emergencyContacts || [],
      });

      await incident.save();

      // Cache incident
      await this.cacheIncident(incident);

      // Notify emergency contacts
      if (driver.emergencyContacts && driver.emergencyContacts.length > 0) {
        await notificationService.notifyEmergencyContacts(
          driver.emergencyContacts,
          incident
        );
      }

      // Find and notify nearby hospitals
      const nearbyHospitals = await this.findNearbyHospitals(incident.location);
      
      for (const hospital of nearbyHospitals) {
        await notificationService.notifyHospital(hospital.id, incident);
      }

      // Try to auto-assign responder
      await this.autoAssignResponder(incident);

      // Update driver stats
      driver.totalTrips = (driver.totalTrips || 0) + 1;
      await driver.save();

      // Log incident
      await this.logIncidentTimeline(incident._id.toString(), 'created', 'Incident reported');

      logger.info(`Incident created: ${incident.incidentId} (Severity: ${incident.severity})`);

      return incident;
    } catch (error) {
      logger.error('Create incident service error:', error);
      throw error;
    }
  }

  async getIncident(incidentId: string): Promise<IIncident | null> {
    try {
      // Try cache first
      const cached = await redisClient.get(`incident:${incidentId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // If not in cache, get from database
      const incident = await Incident.findById(incidentId)
        .populate('driverId', 'name phone email')
        .populate('hospitalId', 'hospitalName phone location');

      if (incident) {
        await this.cacheIncident(incident);
      }

      return incident;
    } catch (error) {
      logger.error('Get incident service error:', error);
      throw error;
    }
  }

  async getIncidentByNumber(incidentNumber: string): Promise<IIncident | null> {
    try {
      return await Incident.findOne({ incidentId: incidentNumber })
        .populate('driverId', 'name phone')
        .populate('hospitalId', 'hospitalName');
    } catch (error) {
      logger.error('Get incident by number error:', error);
      throw error;
    }
  }

  async updateIncident(
    incidentId: string,
    updates: IUpdateIncidentDTO
  ): Promise<IIncident> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const oldStatus = incident.status;

      // Apply updates
      Object.assign(incident, updates);

      // Update timestamps based on status
      if (updates.status) {
        switch (updates.status) {
          case 'confirmed':
            incident.confirmedAt = new Date();
            break;
          case 'resolved':
          case 'cancelled':
            incident.resolvedAt = new Date();
            break;
        }
      }

      await incident.save();

      // Update cache
      await this.cacheIncident(incident);

      // Log status change
      if (oldStatus !== incident.status) {
        await this.logIncidentTimeline(
          incidentId,
          'status_change',
          `Status changed from ${oldStatus} to ${incident.status}`
        );
      }

      // Send notifications
      await notificationService.sendIncidentUpdate(incident, 'status');

      logger.info(`Incident updated: ${incident.incidentId} (Status: ${incident.status})`);

      return incident;
    } catch (error) {
      logger.error('Update incident service error:', error);
      throw error;
    }
  }

  async acceptIncident(
    incidentId: string,
    acceptData: IAcceptIncidentDTO
  ): Promise<IIncident> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // Add responder
      const responderInfo = {
        id: acceptData.responderId,
        name: acceptData.responderName,
        type: 'ambulance',
        hospital: acceptData.hospitalId,
        eta: acceptData.eta,
        distance: acceptData.distance,
        status: 'dispatched',
        dispatchedAt: new Date(),
      };

      incident.responders.push(responderInfo);
      incident.status = 'dispatched';
      incident.hospitalId = acceptData.hospitalId as any;

      await incident.save();

      // Update hospital stats
      await HospitalStats.findOneAndUpdate(
        { hospitalId: acceptData.hospitalId },
        {
          $inc: { 
            activeIncidents: 1,
            availableAmbulances: -1,
            availableResponders: -1,
          },
          $set: { lastUpdated: new Date() },
        },
        { upsert: true }
      );

      // Update responder status
      await ResponderStatus.findOneAndUpdate(
        { responderId: acceptData.responderId },
        {
          isAvailable: false,
          currentIncidentId: incident._id,
          status: 'en-route',
          lastUpdate: new Date(),
        },
        { upsert: true }
      );

      // Log acceptance
      await this.logIncidentTimeline(
        incidentId,
        'responder_accepted',
        `Responder ${acceptData.responderName} accepted and dispatched`,
        { responderId: acceptData.responderId, eta: acceptData.eta }
      );

      // Send notifications
      await notificationService.notifyDriver(
        incident.driverId.toString(),
        `Responder ${acceptData.responderName} has been dispatched. ETA: ${acceptData.eta} minutes`,
        { responder: responderInfo }
      );

      logger.info(`Incident accepted: ${incident.incidentId} by hospital ${acceptData.hospitalId}`);

      return incident;
    } catch (error) {
      logger.error('Accept incident service error:', error);
      throw error;
    }
  }

  async getActiveIncidents(params: {
    status?: string[];
    severity?: string[];
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
  }): Promise<IIncident[]> {
    try {
      const query: any = {};

      if (params.status && params.status.length > 0) {
        query.status = { $in: params.status };
      } else {
        query.status = { $in: ['pending', 'detected', 'confirmed', 'dispatched', 'en-route'] };
      }

      if (params.severity && params.severity.length > 0) {
        query.severity = { $in: params.severity };
      }

      // Geospatial query if coordinates provided
      if (params.lat && params.lng && params.radius) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [params.lng, params.lat],
            },
            $maxDistance: params.radius * 1000, // Convert to meters
          },
        };
      }

      const incidents = await Incident.find(query)
        .sort({ severity: -1, timestamp: -1 })
        .limit(params.limit || 50)
        .populate('driverId', 'name phone');

      return incidents;
    } catch (error) {
      logger.error('Get active incidents error:', error);
      throw error;
    }
  }

  async getUserIncidents(
    userId: string,
    params: {
      limit?: number;
      offset?: number;
      status?: string[];
    } = {}
  ): Promise<{ incidents: IIncident[]; total: number }> {
    try {
      const query: any = { driverId: userId };

      if (params.status && params.status.length > 0) {
        query.status = { $in: params.status };
      }

      const [incidents, total] = await Promise.all([
        Incident.find(query)
          .sort({ timestamp: -1 })
          .limit(params.limit || 20)
          .skip(params.offset || 0),
        Incident.countDocuments(query),
      ]);

      return { incidents, total };
    } catch (error) {
      logger.error('Get user incidents error:', error);
      throw error;
    }
  }

  async getHospitalIncidents(
    hospitalId: string,
    params: {
      limit?: number;
      offset?: number;
      status?: string[];
    } = {}
  ): Promise<{ incidents: IIncident[]; total: number }> {
    try {
      const query: any = { hospitalId };

      if (params.status && params.status.length > 0) {
        query.status = { $in: params.status };
      }

      const [incidents, total] = await Promise.all([
        Incident.find(query)
          .sort({ timestamp: -1 })
          .limit(params.limit || 20)
          .skip(params.offset || 0)
          .populate('driverId', 'name phone'),
        Incident.countDocuments(query),
      ]);

      return { incidents, total };
    } catch (error) {
      logger.error('Get hospital incidents error:', error);
      throw error;
    }
  }

  async getIncidentStats(timeframe: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<any> {
    try {
      const startDate = this.getStartDate(timeframe);

      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate },
          },
        },
        {
          $facet: {
            bySeverity: [
              {
                $group: {
                  _id: '$severity',
                  count: { $sum: 1 },
                },
              },
            ],
            byType: [
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 },
                },
              },
            ],
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                },
              },
            ],
            timeline: [
              {
                $group: {
                  _id: {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' },
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            ],
            averageResponseTime: [
              {
                $match: {
                  'responders.0': { $exists: true },
                  'responders.arrivedAt': { $ne: null },
                },
              },
              {
                $project: {
                  responseTime: {
                    $avg: {
                      $map: {
                        input: '$responders',
                        as: 'responder',
                        in: {
                          $divide: [
                            { $subtract: ['$$responder.arrivedAt', '$detectedAt'] },
                            60000, // Convert to minutes
                          ],
                        },
                      },
                    },
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  avgResponseTime: { $avg: '$responseTime' },
                },
              },
            ],
          },
        },
      ];

      const [stats] = await Incident.aggregate(pipeline);

      // Format the response
      return {
        timeframe,
        total: await Incident.countDocuments({ timestamp: { $gte: startDate } }),
        bySeverity: stats.bySeverity.reduce((acc: any, curr: any) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byType: stats.byType.reduce((acc: any, curr: any) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byStatus: stats.byStatus.reduce((acc: any, curr: any) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        timeline: stats.timeline.map((item: any) => ({
          date: `${item._id.year}-${item._id.month}-${item._id.day}`,
          count: item.count,
        })),
        averageResponseTime: Math.round(stats.averageResponseTime[0]?.avgResponseTime || 0),
      };
    } catch (error) {
      logger.error('Get incident stats error:', error);
      throw error;
    }
  }

  async autoAssignResponder(incident: IIncident): Promise<void> {
    try {
      // Only auto-assign for high severity incidents
      if (incident.severity !== 'high' && incident.severity !== 'critical') {
        return;
      }

      // Find nearest hospital
      const hospitals = await this.findNearbyHospitals(incident.location, 5);
      
      if (hospitals.length === 0) {
        logger.warn(`No hospitals found near incident ${incident.incidentId}`);
        return;
      }

      // Try to assign responder from nearest hospital
      for (const hospital of hospitals) {
        try {
          const assignment = await responderService.assignResponder(
            incident._id.toString(),
            hospital.id
          );

          if (assignment) {
            logger.info(`Auto-assigned responder to incident ${incident.incidentId}`);
            break;
          }
        } catch (error) {
          logger.warn(`Failed to assign responder from hospital ${hospital.id}:`, error);
          continue;
        }
      }
    } catch (error) {
      logger.error('Auto-assign responder error:', error);
    }
  }

  async findNearbyHospitals(
    location: ICoordinates,
    radius: number = 10
  ): Promise<any[]> {
    try {
      // This would use geospatial query in production
      // For now, return mock data
      return [];
    } catch (error) {
      logger.error('Find nearby hospitals error:', error);
      return [];
    }
  }

  async updateResponderLocation(
    incidentId: string,
    responderId: string,
    location: ICoordinates
  ): Promise<void> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const responderIndex = incident.responders.findIndex(r => r.id === responderId);
      if (responderIndex === -1) {
        throw new Error('Responder not found in incident');
      }

      // Update responder location
      incident.responders[responderIndex].location = location;

      // Recalculate ETA
      const eta = locationService.calculateETA(location, incident.location);
      incident.responders[responderIndex].eta = eta;

      await incident.save();

      // Notify driver of updated ETA
      await notificationService.notifyDriver(
        incident.driverId.toString(),
        `Responder ETA updated: ${eta} minutes`,
        { responderId, eta }
      );
    } catch (error) {
      logger.error('Update responder location error:', error);
      throw error;
    }
  }

  async markResponderArrived(incidentId: string, responderId: string): Promise<void> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const responderIndex = incident.responders.findIndex(r => r.id === responderId);
      if (responderIndex === -1) {
        throw new Error('Responder not found in incident');
      }

      incident.responders[responderIndex].status = 'arrived';
      incident.responders[responderIndex].arrivedAt = new Date();
      incident.status = 'arrived';

      await incident.save();

      // Update responder status
      await ResponderStatus.findOneAndUpdate(
        { responderId },
        { status: 'on-scene' }
      );

      // Log timeline
      await this.logIncidentTimeline(
        incidentId,
        'responder_arrived',
        `Responder arrived at scene`
      );

      // Notify driver
      await notificationService.notifyDriver(
        incident.driverId.toString(),
        'Responder has arrived at the scene'
      );
    } catch (error) {
      logger.error('Mark responder arrived error:', error);
      throw error;
    }
  }

  async resolveIncident(incidentId: string, resolvedBy: string): Promise<void> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      incident.status = 'resolved';
      incident.resolvedAt = new Date();
      incident.updatedBy = resolvedBy as any;

      await incident.save();

      // Update responder statuses
      for (const responder of incident.responders) {
        await ResponderStatus.findOneAndUpdate(
          { responderId: responder.id },
          {
            isAvailable: true,
            status: 'available',
            currentIncidentId: null,
          }
        );
      }

      // Update hospital stats
      if (incident.hospitalId) {
        await HospitalStats.findOneAndUpdate(
          { hospitalId: incident.hospitalId },
          {
            $inc: { activeIncidents: -1, resolvedIncidents: 1 },
            $set: { lastUpdated: new Date() },
          }
        );
      }

      // Log resolution
      await this.logIncidentTimeline(
        incidentId,
        'resolved',
        `Incident resolved`
      );

      logger.info(`Incident resolved: ${incident.incidentId}`);
    } catch (error) {
      logger.error('Resolve incident error:', error);
      throw error;
    }
  }

  async cancelIncident(incidentId: string, reason: string): Promise<void> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      incident.status = 'cancelled';
      incident.resolvedAt = new Date();

      await incident.save();

      // Free up any assigned responders
      for (const responder of incident.responders) {
        await ResponderStatus.findOneAndUpdate(
          { responderId: responder.id },
          {
            isAvailable: true,
            status: 'available',
            currentIncidentId: null,
          }
        );
      }

      // Log cancellation
      await this.logIncidentTimeline(
        incidentId,
        'cancelled',
        `Incident cancelled: ${reason}`
      );

      logger.info(`Incident cancelled: ${incident.incidentId} - ${reason}`);
    } catch (error) {
      logger.error('Cancel incident error:', error);
      throw error;
    }
  }

  async getIncidentTimeline(incidentId: string): Promise<any[]> {
    try {
      // This would come from a Timeline model in production
      // For now, return mock data
      return [];
    } catch (error) {
      logger.error('Get incident timeline error:', error);
      throw error;
    }
  }

  private async logIncidentTimeline(
    incidentId: string,
    event: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    // This would save to a Timeline model in production
    logger.debug(`Incident ${incidentId} timeline: ${event} - ${description}`);
  }

  private async cacheIncident(incident: IIncident): Promise<void> {
    try {
      await redisClient.setex(
        `incident:${incident._id}`,
        this.INCIDENT_CACHE_TTL,
        JSON.stringify(incident)
      );
      await redisClient.setex(
        `incident:number:${incident.incidentId}`,
        this.INCIDENT_CACHE_TTL,
        JSON.stringify(incident)
      );
    } catch (error) {
      logger.error('Error caching incident:', error);
    }
  }

  private calculateSeverity(
    impactForce: number,
    speed: number,
    airbagDeployed: boolean
  ): IncidentSeverity {
    if (airbagDeployed || impactForce >= this.SEVERITY_THRESHOLDS.critical.impactForce) {
      return 'critical';
    }
    if (impactForce >= this.SEVERITY_THRESHOLDS.high.impactForce) {
      return 'high';
    }
    if (impactForce >= this.SEVERITY_THRESHOLDS.medium.impactForce) {
      return 'medium';
    }
    return 'low';
  }

  private getStartDate(timeframe: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  async generateIncidentReport(incidentId: string): Promise<any> {
    try {
      const incident = await this.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // Get driver location history
      const locations = await Location.find({ driverId: incident.driverId })
        .sort({ timestamp: -1 })
        .limit(100);

      // Calculate metrics
      const responseTime = incident.responders[0]?.arrivedAt
        ? (new Date(incident.responders[0].arrivedAt).getTime() - new Date(incident.detectedAt).getTime()) / 60000
        : null;

      return {
        incident: {
          id: incident.incidentId,
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          timestamp: incident.timestamp,
          location: incident.location,
          address: incident.locationAddress,
        },
        driver: {
          name: incident.driverName,
          phone: incident.driverPhone,
        },
        vehicle: {
          number: incident.vehicleNumber,
          make: incident.vehicleMake,
          model: incident.vehicleModel,
        },
        details: {
          speed: incident.speed,
          impactForce: incident.impactForce,
          airbagDeployed: incident.airbagDeployed,
          occupants: incident.occupants,
          injuries: incident.injuries,
          fatalities: incident.fatalities,
        },
        response: {
          responseTime: responseTime ? Math.round(responseTime * 10) / 10 : null,
          responders: incident.responders,
          hospital: incident.assignedHospital,
        },
        timeline: await this.getIncidentTimeline(incidentId),
        locationHistory: locations.map(l => ({
          lat: l.latitude,
          lng: l.longitude,
          timestamp: l.timestamp,
          speed: l.speed,
        })),
      };
    } catch (error) {
      logger.error('Generate incident report error:', error);
      throw error;
    }
  }
}

export const incidentService = new IncidentService();