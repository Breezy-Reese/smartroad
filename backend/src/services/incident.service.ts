import { Incident } from '../models/Incident.model';
import { User } from '../models/User.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/Responder.model';
import { notificationService } from './notification.service';
import { responderService } from './responder.service';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis.config';

import {
  IIncident,
  ICreateIncidentDTO,
  IUpdateIncidentDTO,
  IAcceptIncidentDTO,
  IncidentSeverity,
} from '../types/incident.types';

export class IncidentService {
  private readonly INCIDENT_CACHE_TTL = 300;

  private readonly SEVERITY_THRESHOLDS = {
    critical: { impactForce: 15, speed: 80 },
    high: { impactForce: 10, speed: 60 },
    medium: { impactForce: 5, speed: 40 },
    low: { impactForce: 2, speed: 20 },
  };

  // ================= CREATE INCIDENT =================
  async createIncident(
    incidentData: ICreateIncidentDTO,
    driverId: string
  ): Promise<IIncident> {
    try {
      const driver = await User.findById(driverId);

      if (!driver) {
        throw new Error('Driver not found');
      }

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

      const incidentObject = (incident as any).toObject() as IIncident;
      await this.cacheIncident(incidentObject);

      if (driver.emergencyContacts?.length) {
        await notificationService.notifyEmergencyContacts(
          driver.emergencyContacts,
          incidentObject
        );
      }

      await this.autoAssignResponder(incidentObject);

      logger.info(
        `Incident created: ${incidentObject.incidentId} (Severity: ${incidentObject.severity})`
      );

      return incidentObject;
    } catch (error) {
      logger.error('Create incident error:', error);
      throw error;
    }
  }

  // ================= GET INCIDENT =================
  async getIncident(incidentId: string): Promise<IIncident | null> {
    try {
      const cached = await redisClient.get(`incident:${incidentId}`);

      if (cached) {
        return JSON.parse(cached);
      }

      const incident = await Incident.findById(incidentId)
        .populate('driverId', 'name phone email')
        .populate('hospitalId', 'hospitalName phone location');

      if (incident) {
        const incidentObject = (incident as any).toObject() as IIncident;
        await this.cacheIncident(incidentObject);
        return incidentObject;
      }

      return null;
    } catch (error) {
      logger.error('Get incident error:', error);
      throw error;
    }
  }

  async getIncidentByNumber(
    incidentNumber: string
  ): Promise<IIncident | null> {
    try {
      const incident = await Incident.findOne({ incidentId: incidentNumber })
        .populate('driverId', 'name phone')
        .populate('hospitalId', 'hospitalName');

      return incident ? (incident as any).toObject() as IIncident : null;
    } catch (error) {
      logger.error('Get incident by number error:', error);
      throw error;
    }
  }

  // ================= UPDATE INCIDENT =================
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

      Object.assign(incident, updates);

      if (updates.status) {
        if (updates.status === 'confirmed') {
          incident.confirmedAt = new Date();
        }

        if (['resolved', 'cancelled'].includes(updates.status)) {
          incident.resolvedAt = new Date();
        }
      }

      await incident.save();

      const updatedIncident = await Incident.findById(incidentId).lean() as unknown as IIncident;

      await this.cacheIncident(updatedIncident);

      if (oldStatus !== incident.status) {
        logger.info(
          `Incident ${incident.incidentId} status changed ${oldStatus} → ${incident.status}`
        );
      }

      await notificationService.sendIncidentUpdate(updatedIncident, 'status');

      return updatedIncident;
    } catch (error) {
      logger.error('Update incident error:', error);
      throw error;
    }
  }

  // ================= ACCEPT INCIDENT =================
  async acceptIncident(
    incidentId: string,
    data: IAcceptIncidentDTO
  ): Promise<IIncident> {
    try {
      const incident = await Incident.findById(incidentId);

      if (!incident) {
        throw new Error('Incident not found');
      }

      const responderInfo = {
        responderId: data.responderId,
        id: data.responderId,
        name: data.responderName,
        type: 'ambulance',
        hospital: data.hospitalId,
        eta: data.eta,
        distance: data.distance,
        status: 'dispatched',
        dispatchedAt: new Date(),
      };

      incident.responders.push(responderInfo as any);
      incident.status = 'dispatched';
      incident.hospitalId = data.hospitalId as any;

      await incident.save();

      await HospitalStats.findOneAndUpdate(
        { hospitalId: data.hospitalId },
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

      await ResponderStatus.findOneAndUpdate(
        { responderId: data.responderId },
        {
          isAvailable: false,
          currentIncidentId: incident._id,
          status: 'en-route',
          lastUpdate: new Date(),
        },
        { upsert: true }
      );

      await notificationService.notifyDriver(
        incident.driverId.toString(),
        `Responder ${data.responderName} dispatched. ETA: ${data.eta} mins`,
        { responder: responderInfo }
      );

      logger.info(
        `Incident ${incident.incidentId} accepted by responder ${data.responderName}`
      );

      const updatedIncident = await Incident.findById(incidentId).lean() as unknown as IIncident;

      return updatedIncident;
    } catch (error) {
      logger.error('Accept incident error:', error);
      throw error;
    }
  }

  // ================= USER INCIDENTS =================
  async getUserIncidents(userId: string): Promise<IIncident[]> {
    try {
      const incidents = await Incident.find({ driverId: userId })
        .sort({ detectedAt: -1 })
        .limit(50)
        .lean();

      return incidents as unknown as IIncident[];
    } catch (error) {
      logger.error('Get user incidents error:', error);
      throw error;
    }
  }

  // ================= ACTIVE INCIDENTS =================
  async getActiveIncidents(params: {
    status?: string[];
    severity?: string[];
    limit?: number;
  }): Promise<IIncident[]> {
    try {
      // ✅ Fix
const query: any = {};

if (params.status?.length) {
  query.status = { $in: params.status };
}

if (params.severity?.length) {
  query.severity = { $in: params.severity };
}

      const incidents = await Incident.find(query)
        .sort({ severity: -1, detectedAt: -1 })
        .limit(params.limit || 50)
        .populate('driverId', 'name phone')
        .lean();

      return incidents as unknown as IIncident[];
    } catch (error) {
      logger.error('Get active incidents error:', error);
      throw error;
    }
  }

  // ================= INCIDENT STATS =================
  async getIncidentStats(period: string = 'month'): Promise<any> {
    try {
      const startDate = this.getStartDate(period as 'day' | 'week' | 'month' | 'year');

      const severityStats = await Incident.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]);

      const total = await Incident.countDocuments({ detectedAt: { $gte: startDate } });

      const statusStats = await Incident.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const avgResponseTime = await this.calculateAverageResponseTime(startDate);

      return {
        period,
        startDate,
        total,
        bySeverity: severityStats,
        byStatus: statusStats,
        averageResponseTime: avgResponseTime
      };
    } catch (error) {
      logger.error('Get incident stats error:', error);
      throw error;
    }
  }

  // ================= SEVERITY CALCULATION =================
  private calculateSeverity(
    impactForce: number,
    speed: number,
    airbagDeployed: boolean
  ): IncidentSeverity {
    if (
      airbagDeployed ||
      impactForce >= this.SEVERITY_THRESHOLDS.critical.impactForce ||
      speed >= this.SEVERITY_THRESHOLDS.critical.speed
    ) {
      return 'critical';
    }

    if (
      impactForce >= this.SEVERITY_THRESHOLDS.high.impactForce ||
      speed >= this.SEVERITY_THRESHOLDS.high.speed
    ) {
      return 'high';
    }

    if (
      impactForce >= this.SEVERITY_THRESHOLDS.medium.impactForce ||
      speed >= this.SEVERITY_THRESHOLDS.medium.speed
    ) {
      return 'medium';
    }

    return 'low';
  }

  // ================= CACHE =================
  private async cacheIncident(incident: IIncident) {
    try {
      await redisClient.setEx(
        `incident:${incident._id}`,
        this.INCIDENT_CACHE_TTL,
        JSON.stringify(incident)
      );
    } catch (error) {
      logger.error('Incident cache error:', error);
    }
  }

  // ================= AUTO RESPONDER ASSIGN =================
  private async autoAssignResponder(incident: IIncident) {
    try {
      if (!['critical', 'high'].includes(incident.severity)) return;

      if (typeof responderService.autoDispatch === 'function') {
        const assignment: any = await responderService.autoDispatch(
          incident._id.toString(),
          incident.location
        );

        if (assignment) {
          logger.info(`Auto responder dispatched for ${incident.incidentId}`);
        }
      } else {
        logger.debug('Auto dispatch not implemented');
      }
    } catch (error) {
      logger.warn('Auto responder assignment failed:', error);
    }
  }

  // ================= HELPER METHODS =================
  private async calculateAverageResponseTime(startDate: Date): Promise<number> {
    try {
      const result = await Incident.aggregate([
        {
          $match: {
            detectedAt: { $gte: startDate },
            confirmedAt: { $exists: true }
          }
        },
        {
          $project: {
            responseTime: {
              $divide: [
                { $subtract: ['$confirmedAt', '$detectedAt'] },
                1000 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$responseTime' }
          }
        }
      ]);

      return result.length > 0 ? Math.round(result[0].average * 10) / 10 : 0;
    } catch (error) {
      logger.error('Calculate average response time error:', error);
      return 0;
    }
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
}

export const incidentService = new IncidentService();