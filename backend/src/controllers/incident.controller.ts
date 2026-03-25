import { Request, Response } from 'express';
import { Incident } from '../models/Incident.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/ResponderStatus.model';
import { logger } from '../utils/logger';
import { IncidentService } from '../services/incident.service';
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

const incidentService = new IncidentService();

/* ============================================================
   CREATE INCIDENT
============================================================ */
export const createIncident = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    if (!driverId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const incident = await incidentService.createIncident(req.body, driverId.toString());

    return res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      data: incident,
    });
  } catch (error: any) {
    logger.error('Create incident error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET INCIDENT
============================================================ */
export const getIncident = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const incident = await incidentService.getIncident(incidentId);

    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    return res.json({ success: true, data: incident });
  } catch (error: any) {
    logger.error('Get incident error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET ACTIVE INCIDENTS
============================================================ */
export const getActiveIncidents = async (req: Request, res: Response) => {
  try {
    const { status, severity, limit = 50, lat, lng, radius } = req.query;

    const statusArray  = status  ? (status  as string).split(',') : [];
    const severityArray = severity ? (severity as string).split(',') : [];

    const incidents = await incidentService.getActiveIncidents({
      status:   statusArray,
      severity: severityArray,
      limit:    parseInt(limit as string),
    });

    let filteredIncidents = incidents;
    if (lat && lng && radius) {
      const latitude  = parseFloat(lat    as string);
      const longitude = parseFloat(lng    as string);
      const maxRadius = parseFloat(radius as string);

      filteredIncidents = incidents.filter((incident: any) => {
        if (!incident.location?.coordinates) return false;
        const [incidentLng, incidentLat] = incident.location.coordinates;
        const distance = calculateDistance(
          { lat: latitude, lng: longitude },
          { lat: incidentLat, lng: incidentLng },
        );
        return distance <= maxRadius;
      });
    }

    return res.json({ success: true, data: filteredIncidents });
  } catch (error: any) {
    logger.error('Get active incidents error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET INCIDENT STATS
============================================================ */
export const getIncidentStats = async (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    const stats = await incidentService.getIncidentStats(period as any);
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error('Get incident stats error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   UPDATE INCIDENT STATUS
============================================================ */
export const updateIncidentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;
    const incident = await incidentService.updateIncident(incidentId, req.body);
    return res.json({ success: true, message: 'Incident updated successfully', data: incident });
  } catch (error: any) {
    logger.error('Update incident error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   UPDATE INCIDENT LOCATION  (PATCH /:incidentId/location)
   Called by the frontend hook once GPS resolves after a
   location-less emergency trigger.
============================================================ */
export const updateIncidentLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { location }   = req.body as {
      location: { latitude: number; longitude: number };
    };

    // Convert { latitude, longitude } → GeoJSON { type: "Point", coordinates: [lng, lat] }
    const geoLocation = {
      type:        'Point' as const,
      coordinates: [location.longitude, location.latitude] as [number, number],
    };

    const incident = await Incident.findByIdAndUpdate(
      incidentId,
      { $set: { location: geoLocation } },
      { new: true },
    );

    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    logger.info(`Incident ${incidentId} location updated to [${location.latitude}, ${location.longitude}]`);

    return res.json({ success: true, data: incident });
  } catch (error: any) {
    logger.error('Update incident location error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   ACCEPT INCIDENT
============================================================ */
export const acceptIncident = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;
    const hospitalId     = req.user?._id;

    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const incident = await incidentService.acceptIncident(incidentId, {
      ...req.body,
      hospitalId: hospitalId.toString(),
    });

    return res.json({ success: true, message: 'Incident accepted successfully', data: incident });
  } catch (error: any) {
    logger.error('Accept incident error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET USER INCIDENTS
============================================================ */
export const getUserIncidents = async (req: Request, res: Response) => {
  try {
    const { userId }              = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum  = parseInt(page  as string);
    const limitNum = parseInt(limit as string);

    const [incidents, total] = await Promise.all([
      Incident.find({ driverId: userId })
        .sort({ detectedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Incident.countDocuments({ driverId: userId }),
    ]);

    return res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page:  pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error('Get user incidents error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   UPDATE RESPONDER LOCATION
============================================================ */
export const updateResponderLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId, responderId } = req.params;
    const { lat, lng }                = req.body;

    const incident = await Incident.findById(incidentId);
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    const responderIndex = incident.responders.findIndex(
      (r) => r.responderId.toString() === responderId,
    );
    if (responderIndex === -1)
      return res.status(404).json({ success: false, error: 'Responder not found' });

    incident.responders[responderIndex].location = { lat, lng };
    await incident.save();

    const eta = 5;
    await notificationService.notifyDriver(
      incident.driverId.toString(),
      `Responder ETA updated to ${eta} minutes`,
      { responderId, eta },
    );

    return res.json({ success: true, message: 'Responder location updated', data: { eta } });
  } catch (error: any) {
    logger.error('Update responder location error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   MARK RESPONDER ARRIVED
============================================================ */
export const markResponderArrived = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId, responderId } = req.params;

    const incident = await Incident.findById(incidentId);
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    const responderIndex = incident.responders.findIndex(
      (r) => r.responderId.toString() === responderId,
    );
    if (responderIndex === -1)
      return res.status(404).json({ success: false, error: 'Responder not found' });

    incident.responders[responderIndex].status    = 'arrived';
    incident.responders[responderIndex].arrivedAt = new Date();
    incident.status                               = 'arrived';
    await incident.save();

    await ResponderStatus.findOneAndUpdate(
      { responderId },
      { status: 'on-scene' },
    );

    await notificationService.notifyDriver(
      incident.driverId.toString(),
      'Responder has arrived at the scene',
    );

    return res.json({ success: true, message: 'Responder marked as arrived' });
  } catch (error: any) {
    logger.error('Mark responder arrived error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   RESOLVE INCIDENT
============================================================ */
export const resolveIncident = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findById(incidentId);
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    incident.status     = 'resolved';
    incident.resolvedAt = new Date();
    await incident.save();

    if (incident.hospitalId) {
      await HospitalStats.findOneAndUpdate(
        { hospitalId: incident.hospitalId },
        { $inc: { activeIncidents: -1 }, $set: { lastUpdated: new Date() } },
      );
    }

    for (const responder of incident.responders) {
      await ResponderStatus.findOneAndUpdate(
        { responderId: responder.responderId },
        { isAvailable: true, status: 'available', currentIncidentId: null },
      );
    }

    logger.info(`Incident ${incidentId} resolved`);
    return res.json({ success: true, message: 'Incident resolved successfully' });
  } catch (error: any) {
    logger.error('Resolve incident error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   CANCEL INCIDENT
============================================================ */
export const cancelIncident = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { reason }     = req.body;

    const incident = await Incident.findById(incidentId);
    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    incident.status     = 'cancelled';
    incident.resolvedAt = new Date();
    await incident.save();

    for (const responder of incident.responders) {
      await ResponderStatus.findOneAndUpdate(
        { responderId: responder.responderId },
        { isAvailable: true, status: 'available', currentIncidentId: null },
      );
    }

    logger.info(`Incident ${incidentId} cancelled: ${reason}`);
    return res.json({ success: true, message: 'Incident cancelled successfully' });
  } catch (error: any) {
    logger.error('Cancel incident error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GENERATE INCIDENT REPORT
============================================================ */
export const generateIncidentReport = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findById(incidentId)
      .populate('driverId',              'name email phone')
      .populate('hospitalId',            'hospitalName')
      .populate('responders.responderId','name responderType');

    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });

    const report = {
      incidentId: incident.incidentId,
      type:       incident.type,
      severity:   incident.severity,
      status:     incident.status,
      timeline: {
        detected:  incident.detectedAt,
        confirmed: incident.confirmedAt,
        resolved:  incident.resolvedAt,
      },
      driver:     incident.driverId,
      location:   incident.location,
      responders: incident.responders,
      statistics: {
        responseTime: incident.confirmedAt
          ? (incident.confirmedAt.getTime() - incident.detectedAt.getTime()) / 1000 / 60
          : null,
        resolutionTime: incident.resolvedAt
          ? (incident.resolvedAt.getTime() - incident.detectedAt.getTime()) / 1000 / 60
          : null,
      },
    };

    return res.json({ success: true, data: report });
  } catch (error: any) {
    logger.error('Generate incident report error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ── Helpers ── */

function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number },
): number {
  const R    = 6371;
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}