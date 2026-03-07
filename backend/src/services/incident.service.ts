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
  Incident as IncidentType,
  ICreateIncidentDTO,
  IUpdateIncidentDTO,
  IAcceptIncidentDTO,
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

  // ------------------- Create Incident -------------------
  async createIncident(
    incidentData: ICreateIncidentDTO,
    driverId: string
  ): Promise<IncidentType> {
    try {
      const driver = await User.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      const severity =
        incidentData.severity ||
        this.calculateSeverity(
          incidentData.impactForce || 0,
          incidentData.speed || 0,
          incidentData.airbagDeployed || false
        );

      const incident = new Incident({
        ...incidentData,
        driverId,
        driverName: driver.name,
        driverPhone: driver.phone,
        severity,
        detectedAt: new Date(),
        emergencyContacts: driver.emergencyContacts || [],
      });

      await incident.save();
      await this.cacheIncident(incident);

      if (driver.emergencyContacts?.length) {
        await notificationService.notifyEmergencyContacts(
          driver.emergencyContacts,
          incident
        );
      }

      const nearbyHospitals = await this.findNearbyHospitals(incident.location);
      for (const hospital of nearbyHospitals) {
        await notificationService.notifyHospital(hospital.id, incident);
      }

      await this.autoAssignResponder(incident);

      driver.totalTrips = (driver.totalTrips || 0) + 1;
      await driver.save();

      await this.logIncidentTimeline(incident._id.toString(), 'created', 'Incident reported');
      logger.info(`Incident created: ${incident.incidentId} (Severity: ${incident.severity})`);

      return incident;
    } catch (error) {
      logger.error('Create incident error:', error);
      throw error;
    }
  }

  // ------------------- Get Incident -------------------
  async getIncident(incidentId: string): Promise<IncidentType | null> {
    try {
      const cached = await redisClient.get(`incident:${incidentId}`);
      if (cached) return JSON.parse(cached);

      const incident = await Incident.findById(incidentId)
        .populate('driverId', 'name phone email')
        .populate('hospitalId', 'hospitalName phone location');

      if (incident) await this.cacheIncident(incident);
      return incident;
    } catch (error) {
      logger.error('Get incident error:', error);
      throw error;
    }
  }

  async getIncidentByNumber(incidentNumber: string): Promise<IncidentType | null> {
    try {
      return Incident.findOne({ incidentId: incidentNumber })
        .populate('driverId', 'name phone')
        .populate('hospitalId', 'hospitalName');
    } catch (error) {
      logger.error('Get incident by number error:', error);
      throw error;
    }
  }

  // ------------------- Update Incident -------------------
  async updateIncident(
    incidentId: string,
    updates: IUpdateIncidentDTO
  ): Promise<IncidentType> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) throw new Error('Incident not found');

      const oldStatus = incident.status;
      Object.assign(incident, updates);

      if (updates.status) {
        if (updates.status === 'confirmed') incident.confirmedAt = new Date();
        if (['resolved', 'cancelled'].includes(updates.status)) incident.resolvedAt = new Date();
      }

      await incident.save();
      await this.cacheIncident(incident);

      if (oldStatus !== incident.status) {
        await this.logIncidentTimeline(
          incidentId,
          'status_change',
          `Status changed from ${oldStatus} to ${incident.status}`
        );
      }

      await notificationService.sendIncidentUpdate(incident, 'status');
      logger.info(`Incident updated: ${incident.incidentId} (Status: ${incident.status})`);

      return incident;
    } catch (error) {
      logger.error('Update incident error:', error);
      throw error;
    }
  }

  // ------------------- Accept Incident -------------------
  async acceptIncident(incidentId: string, data: IAcceptIncidentDTO): Promise<IncidentType> {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) throw new Error('Incident not found');

      const responderInfo = {
        id: data.responderId,
        name: data.responderName,
        type: 'ambulance',
        hospital: data.hospitalId,
        eta: data.eta,
        distance: data.distance,
        status: 'dispatched',
        dispatchedAt: new Date(),
      };

      incident.responders.push(responderInfo);
      incident.status = 'dispatched';
      incident.hospitalId = data.hospitalId as any;

      await incident.save();

      await HospitalStats.findOneAndUpdate(
        { hospitalId: data.hospitalId },
        {
          $inc: { activeIncidents: 1, availableAmbulances: -1, availableResponders: -1 },
          $set: { lastUpdated: new Date() },
        },
        { upsert: true }
      );

      await ResponderStatus.findOneAndUpdate(
        { responderId: data.responderId },
        { isAvailable: false, currentIncidentId: incident._id, status: 'en-route', lastUpdate: new Date() },
        { upsert: true }
      );

      await this.logIncidentTimeline(
        incidentId,
        'responder_accepted',
        `Responder ${data.responderName} accepted`,
        { responderId: data.responderId, eta: data.eta }
      );

      await notificationService.notifyDriver(
        incident.driverId.toString(),
        `Responder ${data.responderName} dispatched. ETA: ${data.eta} mins`,
        { responder: responderInfo }
      );

      logger.info(`Incident accepted: ${incident.incidentId} by hospital ${data.hospitalId}`);
      return incident;
    } catch (error) {
      logger.error('Accept incident error:', error);
      throw error;
    }
  }

  // ------------------- Get Active Incidents -------------------
  async getActiveIncidents(params: {
    status?: string[];
    severity?: string[];
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
  }): Promise<IncidentType[]> {
    try {
      const query: any = {};
      query.status = params.status?.length ? { $in: params.status } : { $in: ['pending', 'detected', 'confirmed', 'dispatched', 'en-route'] };
      if (params.severity?.length) query.severity = { $in: params.severity };
      if (params.lat && params.lng && params.radius) {
        query.location = { $near: { $geometry: { type: 'Point', coordinates: [params.lng, params.lat] }, $maxDistance: params.radius * 1000 } };
      }

      return Incident.find(query)
        .sort({ severity: -1, timestamp: -1 })
        .limit(params.limit || 50)
        .populate('driverId', 'name phone');
    } catch (error) {
      logger.error('Get active incidents error:', error);
      throw error;
    }
  }

  // ------------------- User & Hospital Incidents -------------------
  async getUserIncidents(userId: string, params: { limit?: number; offset?: number; status?: string[] } = {}): Promise<{ incidents: IncidentType[]; total: number }> {
    const query: any = { driverId: userId };
    if (params.status?.length) query.status = { $in: params.status };

    const [incidents, total] = await Promise.all([
      Incident.find(query).sort({ timestamp: -1 }).limit(params.limit || 20).skip(params.offset || 0),
      Incident.countDocuments(query),
    ]);
    return { incidents, total };
  }

  async getHospitalIncidents(hospitalId: string, params: { limit?: number; offset?: number; status?: string[] } = {}): Promise<{ incidents: IncidentType[]; total: number }> {
    const query: any = { hospitalId };
    if (params.status?.length) query.status = { $in: params.status };

    const [incidents, total] = await Promise.all([
      Incident.find(query).sort({ timestamp: -1 }).limit(params.limit || 20).skip(params.offset || 0).populate('driverId', 'name phone'),
      Incident.countDocuments(query),
    ]);
    return { incidents, total };
  }

  // ------------------- Incident Stats -------------------
  async getIncidentStats(timeframe: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<any> {
    try {
      const startDate = this.getStartDate(timeframe);

      const stats = await Incident.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $facet: {
            bySeverity: [{ $group: { _id: '$severity', count: { $sum: 1 } } }],
            byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            timeline: [
              { $group: { _id: { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' } }, count: { $sum: 1 } } },
              { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            ],
            averageResponseTime: [
              { $match: { 'responders.0': { $exists: true }, 'responders.arrivedAt': { $ne: null } } },
              { $project: { responseTime: { $avg: { $map: { input: '$responders', as: 'responder', in: { $divide: [{ $subtract: ['$$responder.arrivedAt', '$detectedAt'] }, 60000] } } } } } },
              { $group: { _id: null, avgResponseTime: { $avg: '$responseTime' } } },
            ],
          }
        }
      ]);

      const stat = stats[0] || {};
      return {
        timeframe,
        total: await Incident.countDocuments({ timestamp: { $gte: startDate } }),
        bySeverity: (stat.bySeverity || []).reduce((acc: any, curr: any) => { acc[curr._id] = curr.count; return acc; }, {}),
        byType: (stat.byType || []).reduce((acc: any, curr: any) => { acc[curr._id] = curr.count; return acc; }, {}),
        byStatus: (stat.byStatus || []).reduce((acc: any, curr: any) => { acc[curr._id] = curr.count; return acc; }, {}),
        timeline: (stat.timeline || []).map((item: any) => ({ date: `${item._id.year}-${item._id.month}-${item._id.day}`, count: item.count })),
        averageResponseTime: Math.round(stat.averageResponseTime?.[0]?.avgResponseTime || 0),
      };
    } catch (error) {
      logger.error('Get incident stats error:', error);
      throw error;
    }
  }

  // ------------------- Helper Methods -------------------
  private calculateSeverity(impactForce: number, _speed: number, airbagDeployed: boolean): IncidentSeverity {
    if (airbagDeployed || impactForce >= this.SEVERITY_THRESHOLDS.critical.impactForce) return 'critical';
    if (impactForce >= this.SEVERITY_THRESHOLDS.high.impactForce) return 'high';
    if (impactForce >= this.SEVERITY_THRESHOLDS.medium.impactForce) return 'medium';
    return 'low';
  }

  private getStartDate(timeframe: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day': return new Date(now.setDate(now.getDate() - 1));
      case 'week': return new Date(now.setDate(now.getDate() - 7));
      case 'month': return new Date(now.setMonth(now.getMonth() - 1));
      case 'year': return new Date(now.setFullYear(now.getFullYear() - 1));
      default: return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  private async cacheIncident(incident: IncidentType) {
    try {
      await redisClient.setEx(`incident:${incident._id}`, this.INCIDENT_CACHE_TTL, JSON.stringify(incident));
      await redisClient.setEx(`incident:number:${incident.incidentId}`, this.INCIDENT_CACHE_TTL, JSON.stringify(incident));
    } catch (error) {
      logger.error('Error caching incident:', error);
    }
  }

  private async logIncidentTimeline(incidentId: string, event: string, description: string, metadata?: any) {
    logger.debug(`Incident ${incidentId} timeline: ${event} - ${description}`, metadata);
  }

  private async findNearbyHospitals(_location: ICoordinates, _radius = 10): Promise<any[]> {
    try {
      // Replace with real geospatial query in production
      return [];
    } catch (error) {
      logger.error('Find nearby hospitals error:', error);
      return [];
    }
  }

  private async autoAssignResponder(incident: IncidentType): Promise<void> {
    if (!['high', 'critical'].includes(incident.severity)) return;
    const hospitals = await this.findNearbyHospitals(incident.location, 5);
    if (!hospitals.length) return;

    for (const hospital of hospitals) {
      try {
        const assignment = await responderService.assignResponder(incident._id.toString(), hospital.id);
        if (assignment) break;
      } catch (error) {
        logger.warn(`Failed to assign responder from hospital ${hospital.id}:`, error);
      }
    }
  }
}

export const incidentService = new IncidentService();