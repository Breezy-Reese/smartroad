import { Request, Response } from 'express';
import { Incident } from '../models/Incident.model';
// Remove unused imports or comment them out for now
// import { User } from '../models/User.model';
// import { Location } from '../models/Location.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/ResponderStatus.model';
import { logger } from '../utils/logger';
import { IncidentService } from '../services/incident.service'; // Changed from incidentService to IncidentService
import { notificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

// Create an instance of the service
const incidentService = new IncidentService();
// REMOVED: Any router-related imports like Router, body, param, query, validate, etc.

// ... all your controller functions remain the same ...

// REMOVED: export default router; (this line should be deleted)
/* ============================================================
   CREATE INCIDENT
============================================================ */
export const createIncident = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?._id;
    
    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const incident = await incidentService.createIncident(req.body, driverId.toString());

    return res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      data: incident
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

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

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

    let statusArray: string[] = [];
    if (status) {
      statusArray = typeof status === 'string' ? status.split(',') : [];
    }

    let severityArray: string[] = [];
    if (severity) {
      severityArray = typeof severity === 'string' ? severity.split(',') : [];
    }

    const incidents = await incidentService.getActiveIncidents({
      status: statusArray,
      severity: severityArray,
      limit: parseInt(limit as string)
    });

    // If location provided, filter by distance
    let filteredIncidents = incidents;
    if (lat && lng && radius) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const maxRadius = parseFloat(radius as string);

      filteredIncidents = incidents.filter((incident: any) => {
        if (!incident.location || !incident.location.coordinates) {
          return false;
        }

        const incidentLng = incident.location.coordinates[0];
        const incidentLat = incident.location.coordinates[1];

        const distance = calculateDistance(
          { lat: latitude, lng: longitude },
          { lat: incidentLat, lng: incidentLng }
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

// Helper function for distance calculation
function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return value * Math.PI / 180;
}

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
    const updates = req.body;

    const incident = await incidentService.updateIncident(incidentId, updates);

    return res.json({
      success: true,
      message: 'Incident updated successfully',
      data: incident
    });
  } catch (error: any) {
    logger.error('Update incident error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   ACCEPT INCIDENT
============================================================ */
export const acceptIncident = async (req: AuthRequest, res: Response) => {
  try {
    const { incidentId } = req.params;
    const hospitalId = req.user?._id;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const acceptData = {
      ...req.body,
      hospitalId: hospitalId.toString()
    };

    const incident = await incidentService.acceptIncident(incidentId, acceptData);

    return res.json({
      success: true,
      message: 'Incident accepted successfully',
      data: incident
    });
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
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const incidents = await Incident.find({ driverId: userId })
      .sort({ detectedAt: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string));

    const total = await Incident.countDocuments({ driverId: userId });

    return res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
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
    const { lat, lng } = req.body;

    const incident = await Incident.findById(incidentId);
    
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const responderIndex = incident.responders.findIndex(
      r => r.responderId.toString() === responderId
    );

    if (responderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Responder not found' });
    }

    incident.responders[responderIndex].location = { lat, lng };
    await incident.save();

    const eta = 5;
    await notificationService.notifyDriver(
      incident.driverId.toString(),
      `Responder ETA updated to ${eta} minutes`,
      { responderId, eta }
    );

    return res.json({
      success: true,
      message: 'Responder location updated',
      data: { eta }
    });
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
    
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const responderIndex = incident.responders.findIndex(
      r => r.responderId.toString() === responderId
    );

    if (responderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Responder not found' });
    }

    incident.responders[responderIndex].status = 'arrived';
    incident.responders[responderIndex].arrivedAt = new Date();
    incident.status = 'arrived';
    await incident.save();

    await ResponderStatus.findOneAndUpdate(
      { responderId },
      { status: 'on-scene' }
    );

    await notificationService.notifyDriver(
      incident.driverId.toString(),
      'Responder has arrived at the scene'
    );

    return res.json({
      success: true,
      message: 'Responder marked as arrived'
    });
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
    const { notes: _notes } = req.body; // Prefix with underscore to avoid unused warning

    const incident = await Incident.findById(incidentId);
    
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    await incident.save();

    if (incident.hospitalId) {
      await HospitalStats.findOneAndUpdate(
        { hospitalId: incident.hospitalId },
        { 
          $inc: { activeIncidents: -1 },
          $set: { lastUpdated: new Date() }
        }
      );
    }

    for (const responder of incident.responders) {
      await ResponderStatus.findOneAndUpdate(
        { responderId: responder.responderId },
        { 
          isAvailable: true,
          status: 'available',
          currentIncidentId: null
        }
      );
    }

    logger.info(`Incident ${incidentId} resolved`);

    return res.json({
      success: true,
      message: 'Incident resolved successfully'
    });
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
    const { reason } = req.body;

    const incident = await Incident.findById(incidentId);
    
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    incident.status = 'cancelled';
    incident.resolvedAt = new Date();
    await incident.save();

    for (const responder of incident.responders) {
      await ResponderStatus.findOneAndUpdate(
        { responderId: responder.responderId },
        { 
          isAvailable: true,
          status: 'available',
          currentIncidentId: null
        }
      );
    }

    logger.info(`Incident ${incidentId} cancelled: ${reason}`);

    return res.json({
      success: true,
      message: 'Incident cancelled successfully'
    });
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
      .populate('driverId', 'name email phone')
      .populate('hospitalId', 'hospitalName')
      .populate('responders.responderId', 'name responderType');

    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const report = {
      incidentId: incident.incidentId,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      timeline: {
        detected: incident.detectedAt,
        confirmed: incident.confirmedAt,
        resolved: incident.resolvedAt
      },
      driver: incident.driverId,
      location: incident.location,
      responders: incident.responders,
      statistics: {
        responseTime: incident.confirmedAt ? 
          (incident.confirmedAt.getTime() - incident.detectedAt.getTime()) / 1000 / 60 : null,
        resolutionTime: incident.resolvedAt ?
          (incident.resolvedAt.getTime() - incident.detectedAt.getTime()) / 1000 / 60 : null
      }
    };

    return res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    logger.error('Generate incident report error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// REMOVE THIS LINE - it doesn't belong in a controller file
// export default router;