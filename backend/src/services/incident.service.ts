import { Incident } from '../models/Incident.model';
import { User } from '../models/User.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/Responder.model';
import { notificationService } from './notification.service';
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
  ): Promise<IncidentType> {
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

      await this.cacheIncident(incident);

      if (driver.emergencyContacts?.length) {
        await notificationService.notifyEmergencyContacts(
          driver.emergencyContacts,
          incident
        );
      }

      await this.autoAssignResponder(incident);

      logger.info(
        `Incident created: ${incident.incidentId} (Severity: ${incident.severity})`
      );

       incident;
    } catch (error) {
      logger.error('Create incident error:', error);
      throw error;
    }
  }

  // ================= GET INCIDENT =================

  async getIncident(incidentId: string): Promise<IncidentType | null> {
    try {
      const cached = await redisClient.get(`incident:${incidentId}`);

      if (cached) {
        return JSON.parse(cached);
      }

      const incident = await Incident.findById(incidentId)
        .populate('driverId', 'name phone email')
        .populate('hospitalId', 'hospitalName phone location');

      if (incident) {
        await this.cacheIncident(incident);
      }

       incident;
    } catch (error) {
      logger.error('Get incident error:', error);
      throw error;
    }
  }

  async getIncidentByNumber(
    incidentNumber: string
  ): Promise<IncidentType | null> {
    try {
       await Incident.findOne({ incidentId: incidentNumber })
        .populate('driverId', 'name phone')
        .populate('hospitalId', 'hospitalName');
    } catch (error) {
      logger.error('Get incident by number error:', error);
      throw error;
    }
  }

  // ================= UPDATE INCIDENT =================

  async updateIncident(
    incidentId: string,
    updates: IUpdateIncidentDTO
  ): Promise<IncidentType> {
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
      await this.cacheIncident(incident);

      if (oldStatus !== incident.status) {
        logger.info(
          `Incident ${incident.incidentId} status changed ${oldStatus} → ${incident.status}`
        );
      }

      await notificationService.sendIncidentUpdate(incident, 'status');

       incident;
    } catch (error) {
      logger.error('Update incident error:', error);
      throw error;
    }
  }

  // ================= ACCEPT INCIDENT =================

  async acceptIncident(
    incidentId: string,
    data: IAcceptIncidentDTO
  ): Promise<IncidentType> {
    try {
      const incident = await Incident.findById(incidentId);

      if (!incident) {
        throw new Error('Incident not found');
      }

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

       incident;
    } catch (error) {
      logger.error('Accept incident error:', error);
      throw error;
    }
  }

  // ================= ACTIVE INCIDENTS =================

  async getActiveIncidents(params: {
    status?: string[];
    severity?: string[];
    limit?: number;
  }): Promise<IncidentType[]> {
    try {
      const query: any = {
        status: params.status || [
          'pending',
          'detected',
          'confirmed',
          'dispatched',
          'en-route',
        ],
      };

      if (params.severity?.length) {
        query.severity = { $in: params.severity };
      }

       await Incident.find(query)
        .sort({ severity: -1, detectedAt: -1 })
        .limit(params.limit || 50)
        .populate('driverId', 'name phone');
    } catch (error) {
      logger.error('Get active incidents error:', error);
      throw error;
    }
  }

  // ================= USER INCIDENTS =================

  async getUserIncidents(userId: string) {
    try {
      return await Incident.find({ driverId: userId })
        .sort({ detectedAt: -1 })
        .limit(50);
    } catch (error) {
      logger.error('Get user incidents error:', error);
      throw error;
    }
  }

  // ================= INCIDENT STATS =================

  async getIncidentStats(timeframe: 'day' | 'week' | 'month' | 'year' = 'month') {
    try {
      const startDate = this.getStartDate(timeframe);

      const stats = await Incident.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } },
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]);

      return stats;
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

  private async cacheIncident(incident: IncidentType) {
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

  // ================= DATE HELPER =================

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

  // ================= AUTO RESPONDER ASSIGN =================

  private async autoAssignResponder(incident: IncidentType) {
    try {
      if (!['critical', 'high'].includes(incident.severity)) return;

      const assignment = await responderService.autoDispatch(
        incident._id.toString(),
        incident.location
      );

      if (assignment) {
        logger.info(`Auto responder dispatched for ${incident.incidentId}`);
      }
    } catch (error) {
      logger.warn('Auto responder assignment failed:', error);
    }
  }
}

export const incidentService = new IncidentService();