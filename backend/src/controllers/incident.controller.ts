import { Request, Response } from 'express';
import { Incident } from '../models/Incident.model';
import { User } from '../models/User.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/Responder.model';
import { notificationService } from '../services/notification.service';
import { locationService } from '../services/location.service';
import { logger } from '../utils/logger';
import { ICreateIncidentDTO, IAcceptIncidentDTO } from '../types/incident.types';

/* ============================================================
   CREATE INCIDENT
============================================================ */
export const createIncident = async (req: Request, res: Response) => {
  try {
    const incidentData: ICreateIncidentDTO = req.body;
    const driverId = (req as any).user?._id;

    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const incident = await Incident.create({
      ...incidentData,
      driverId,
      detectedAt: new Date(),
    });

    const driver = await User.findById(driverId);

    if (driver?.emergencyContacts?.length) {
      await notificationService.notifyEmergencyContacts(driver.emergencyContacts, incident);
    }

    const nearbyHospitals = await locationService.findNearbyHospitals(incident.location, 10);

    const io = req.app.get('io');
    io?.emit('new-incident', incident);

    nearbyHospitals.forEach((hospital: any) => {
      io?.to(`hospital-${hospital.id}`).emit('emergency-alert', {
        incidentId: incident._id,
        driverName: incident.driverName,
        location: incident.location,
        severity: incident.severity,
      });
    });

    await notificationService.sendEmergencySMS({
      to: process.env.EMERGENCY_PHONE_NUMBER || '911',
      message: `EMERGENCY at ${incident.location.lat},${incident.location.lng}. Severity: ${incident.severity}`,
    });

    return res.status(201).json({ success: true, data: incident });
  } catch (error: any) {
    logger.error('Create incident error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create incident' });
  }
};

/* ============================================================
   GET INCIDENT BY ID
============================================================ */
export const getIncident = async (req: Request, res: Response) => {
  try {
    const incident = await Incident.findById(req.params.incidentId)
      .populate('driverId', 'name phone')
      .populate('hospitalId', 'hospitalName');

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    return res.json({ success: true, data: incident });
  } catch (error: any) {
    logger.error('Get incident error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch incident' });
  }
};

/* ============================================================
   GET ACTIVE INCIDENTS
============================================================ */
export const getActiveIncidents = async (req: Request, res: Response) => {
  try {
    const { status, severity, lat, lng, radius } = req.query;

    const query: any = {};
    query.status = status || { $in: ['pending','detected','confirmed','dispatched','en-route'] };
    if (severity) query.severity = severity;

    if (lat && lng && radius) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng as string), parseFloat(lat as string)] },
          $maxDistance: parseInt(radius as string) * 1000,
        },
      };
    }

    const incidents = await Incident.find(query)
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('driverId', 'name phone');

    return res.json({ success: true, data: incidents });
  } catch (error: any) {
    logger.error('Get active incidents error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch incidents' });
  }
};

/* ============================================================
   UPDATE INCIDENT STATUS
============================================================ */
export const updateIncidentStatus = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { status } = req.body;
    const updatedBy = (req as any).user?._id;

    const incident = await Incident.findById(incidentId);
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    const oldStatus = incident.status;
    incident.status = status;
    incident.updatedBy = updatedBy;

    if (status === 'resolved' || status === 'cancelled') incident.resolvedAt = new Date();
    if (status === 'confirmed') incident.confirmedAt = new Date();

    await incident.save();

    // Update hospital stats if needed
    if (incident.hospitalId && (status === 'resolved' || status === 'cancelled')) {
      await HospitalStats.findOneAndUpdate(
        { hospitalId: incident.hospitalId },
        {
          $inc: { activeIncidents: -1, resolvedIncidents: status === 'resolved' ? 1 : 0 },
          $set: { lastUpdated: new Date() },
        }
      );
    }

    const io = req.app.get('io');
    io?.emit('incident-update', incident);

    if (oldStatus !== status) {
      if (incident.hospitalId) io?.to(`hospital-${incident.hospitalId}`).emit('incident-update', incident);
      incident.responders?.forEach((r: any) => r?.id && io?.to(`responder-${r.id}`).emit('incident-update', incident));
    }

    return res.json({ success: true, data: incident });
  } catch (error: any) {
    logger.error('Update incident error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update incident' });
  }
};

/* ============================================================
   ACCEPT INCIDENT (RESPONDER)
============================================================ */
export const acceptIncident = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const data: IAcceptIncidentDTO = req.body;

    const incident = await Incident.findById(incidentId);
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

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
      { $inc: { activeIncidents: 1, availableAmbulances: -1, availableResponders: -1 }, $set: { lastUpdated: new Date() } },
      { upsert: true }
    );

    await ResponderStatus.findOneAndUpdate(
      { responderId: data.responderId },
      { isAvailable: false, currentIncidentId: incident._id, status: 'en-route', lastUpdate: new Date() },
      { upsert: true }
    );

    const io = req.app.get('io');
    io?.to(`driver-${incident.driverId}`).emit('responder-accepted', { incidentId: incident._id, responder: responderInfo });
    io?.emit('responder-accepted', { incidentId: incident._id, responder: responderInfo, hospitalId: data.hospitalId });

    return res.json({ success: true, data: incident });
  } catch (error: any) {
    logger.error('Accept incident error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to accept incident' });
  }
};

/* ============================================================
   USER INCIDENTS
============================================================ */
export const getUserIncidents = async (req: Request, res: Response) => {
  try {
    const incidents = await Incident.find({ driverId: req.params.userId }).sort({ timestamp: -1 });
    return res.json({ success: true, data: incidents });
  } catch (error: any) {
    logger.error('Get user incidents error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch user incidents' });
  }
};

/* ============================================================
   INCIDENT STATS
============================================================ */
export const getIncidentStats = async (_req: Request, res: Response) => {
  try {
    const stats = await Incident.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]);
    return res.json({ success: true, data: stats[0] || { total: 0 } });
  } catch (error: any) {
    logger.error('Incident stats error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch stats' });
  }
};

/* ============================================================
   PLACEHOLDER SAFE FUNCTIONS
============================================================ */
export const updateResponderLocation = async (_req: Request, res: Response) => res.json({ message: 'Responder location updated' });
export const markResponderArrived = async (_req: Request, res: Response) => res.json({ message: 'Responder arrived' });
export const resolveIncident = async (_req: Request, res: Response) => res.json({ message: 'Incident resolved' });
export const cancelIncident = async (_req: Request, res: Response) => res.json({ message: 'Incident cancelled' });
export const generateIncidentReport = async (_req: Request, res: Response) => res.json({ message: 'Incident report generated' });