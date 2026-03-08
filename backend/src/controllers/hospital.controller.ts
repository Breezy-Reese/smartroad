import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { HospitalStats } from '../models/Hospital.model';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

/* ============================================================
   GET HOSPITAL DASHBOARD
============================================================ */
export const getHospitalDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get hospital stats
    const stats = await HospitalStats.findOne({ hospitalId });

    // Get active incidents
    const activeIncidents = await Incident.find({
      hospitalId,
      status: { $in: ['dispatched', 'en-route', 'arrived', 'treating'] }
    }).sort({ detectedAt: -1 }).limit(10);

    // Get available responders
    const availableResponders = await User.countDocuments({
      hospitalId,
      role: 'responder',
      isActive: true,
      'responderStatus.isAvailable': true
    });

    // Get total incidents handled
    const totalIncidents = await Incident.countDocuments({ hospitalId });

    return res.json({
      success: true,
      data: {
        stats: stats || {
          beds: 0,
          ambulances: 0,
          responders: 0,
          activeIncidents: activeIncidents.length
        },
        activeIncidents,
        availableResponders,
        totalIncidents,
        lastUpdated: stats?.lastUpdated || new Date()
      }
    });
  } catch (error: any) {
    logger.error('Get hospital dashboard error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   UPDATE HOSPITAL CAPACITY
============================================================ */
export const updateHospitalCapacity = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { beds, ambulances, responders } = req.body;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const stats = await HospitalStats.findOneAndUpdate(
      { hospitalId },
      {
        $set: {
          ...(beds !== undefined && { beds }),
          ...(ambulances !== undefined && { ambulances }),
          ...(responders !== undefined && { responders }),
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );

    logger.info(`Hospital capacity updated: ${hospitalId}`);

    return res.json({
      success: true,
      message: 'Capacity updated successfully',
      data: stats
    });
  } catch (error: any) {
    logger.error('Update hospital capacity error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET HOSPITAL INCIDENTS
============================================================ */
export const getHospitalIncidents = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { page = 1, limit = 20, status } = req.query;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const query: any = { hospitalId };
    if (status) {
      query.status = status;
    }

    const incidents = await Incident.find(query)
      .sort({ detectedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('driverId', 'name phone')
      .populate('responders.id', 'name');

    const total = await Incident.countDocuments(query);

    return res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error: any) {
    logger.error('Get hospital incidents error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET AVAILABLE RESPONDERS
============================================================ */
export const getAvailableResponders = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const responders = await User.find({
      hospitalId,
      role: 'responder',
      isActive: true
    }).select('name email phone responderType certifications experience currentLocation');

    // Get responder statuses
    const respondersWithStatus = await Promise.all(
      responders.map(async (responder) => {
        // You'd need a ResponderStatus model here
        const status = { isAvailable: true, currentIncidentId: null }; // Placeholder
        return {
          ...responder.toObject(),
          status: status.isAvailable ? 'available' : 'busy',
          currentIncidentId: status.currentIncidentId
        };
      })
    );

    return res.json({
      success: true,
      data: respondersWithStatus
    });
  } catch (error: any) {
    logger.error('Get available responders error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   DISPATCH RESPONDER
============================================================ */
export const dispatchResponder = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { incidentId, responderId } = req.body;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const responder = await User.findOne({ _id: responderId, hospitalId, role: 'responder' });
    if (!responder) {
      return res.status(404).json({ success: false, error: 'Responder not found' });
    }

    // Calculate ETA
    const eta = 10; // Placeholder - calculate actual ETA

    const responderInfo = {
      id: responderId,
      name: responder.name,
      type: responder.responderType || 'ambulance',
      hospital: hospitalId.toString(),
      eta,
      distance: 5, // Placeholder - calculate actual distance
      status: 'dispatched',
      dispatchedAt: new Date()
    };

    incident.responders.push(responderInfo as any);
    incident.status = 'dispatched';
    incident.hospitalId = hospitalId as any;
    await incident.save();

    // Update responder status (you'd need a ResponderStatus model)
    // await ResponderStatus.findOneAndUpdate(...)

    logger.info(`Responder ${responderId} dispatched to incident ${incidentId}`);

    return res.json({
      success: true,
      message: 'Responder dispatched successfully',
      data: { incident, responder: responderInfo }
    });
  } catch (error: any) {
    logger.error('Dispatch responder error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET HOSPITAL ANALYTICS
============================================================ */
export const getHospitalAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.params.hospitalId || req.user?._id;
    const { period = 'month' } = req.query;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Get incidents in period
    const incidents = await Incident.find({
      hospitalId,
      detectedAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate stats
    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const avgResponseTime = 15; // Placeholder - calculate actual average

    // Group by day/week for trends
    const incidentsByDay = incidents.reduce((acc: any, incident) => {
      const day = incident.detectedAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        summary: {
          totalIncidents,
          resolvedIncidents,
          criticalIncidents,
          avgResponseTime
        },
        incidentsByDay: Object.entries(incidentsByDay).map(([date, count]) => ({ date, count }))
      }
    });
  } catch (error: any) {
    logger.error('Get hospital analytics error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   UPDATE HOSPITAL LOCATION
============================================================ */
export const updateHospitalLocation = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { lat, lng } = req.body;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const hospital = await User.findByIdAndUpdate(
      hospitalId,
      {
        $set: {
          location: { lat, lng }
        }
      },
      { new: true }
    ).select('name location');

    if (!hospital) {
      return res.status(404).json({ success: false, error: 'Hospital not found' });
    }

    logger.info(`Hospital location updated: ${hospitalId}`);

    return res.json({
      success: true,
      message: 'Location updated successfully',
      data: hospital.location
    });
  } catch (error: any) {
    logger.error('Update hospital location error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET NEARBY HOSPITALS
============================================================ */
export const getNearbyHospitals = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const searchRadius = parseFloat(radius as string);

    // Find hospitals with location
    const hospitals = await User.find({
      role: 'hospital',
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: searchRadius * 1000
        }
      }
    }).select('hospitalName address phone location');

    // Get stats for each hospital
    const hospitalsWithStats = await Promise.all(
      hospitals.map(async (hospital) => {
        const stats = await HospitalStats.findOne({ hospitalId: hospital._id });
        return {
          ...hospital.toObject(),
          stats: stats || { beds: 0, ambulances: 0, responders: 0 }
        };
      })
    );

    return res.json({
      success: true,
      data: {
        hospitals: hospitalsWithStats,
        count: hospitalsWithStats.length,
        center: { lat: latitude, lng: longitude },
        radius: searchRadius
      }
    });
  } catch (error: any) {
    logger.error('Get nearby hospitals error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};