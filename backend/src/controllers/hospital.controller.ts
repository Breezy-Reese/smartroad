import { Ambulance } from '../models/Ambulance.model';
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
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const stats = await HospitalStats.findOne({ hospitalId });

    const activeIncidents = await Incident.find({
      hospitalId,
      status: { $in: ['dispatched', 'en-route', 'arrived', 'treating'] }
    }).sort({ detectedAt: -1 }).limit(10);

    const availableResponders = await User.countDocuments({
      hospitalId, role: 'responder', isActive: true,
      'responderStatus.isAvailable': true
    });

    const totalIncidents = await Incident.countDocuments({ hospitalId });

    return res.json({
      success: true,
      data: {
        stats: stats || { beds: 0, ambulances: 0, responders: 0, activeIncidents: activeIncidents.length },
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
   GET HOSPITAL STATS
============================================================ */
export const getHospitalStats = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const [
      stats,
      availableAmbulances,
      totalAmbulances,
      availableResponders,
      totalResponders,
      activeIncidents,
    ] = await Promise.all([
      HospitalStats.findOne({ hospitalId }),

      // ✅ No hospitalId filter — Ambulance schema has no hospitalId field
      Ambulance.countDocuments({ status: 'available', isActive: true }),
      Ambulance.countDocuments({ isActive: true }),

      User.countDocuments({
        hospitalId, role: 'responder', isActive: true,
        'responderStatus.isAvailable': true,
      }),
      User.countDocuments({ hospitalId, role: 'responder', isActive: true }),

      // ✅ Live count from Incident collection
      Incident.countDocuments({
        hospitalId,
        status: { $in: ['dispatched', 'en-route', 'arrived', 'treating', 'pending', 'detected'] },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        availableAmbulances,
        totalAmbulances,
        availableResponders: availableResponders || totalResponders,
        // ✅ Try both field name variants
        availableBeds:       stats?.availableBeds ?? (stats as any)?.beds ?? 0,
        activeIncidents,
        averageResponseTime: stats?.averageResponseTime ?? (stats as any)?.avgResponseTime ?? 0,
        lastUpdated:         stats?.lastUpdated ?? new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Get hospital stats error:', error);
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
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const stats = await HospitalStats.findOneAndUpdate(
      { hospitalId },
      { $set: { ...(beds !== undefined && { beds }), ...(ambulances !== undefined && { ambulances }), ...(responders !== undefined && { responders }), lastUpdated: new Date() } },
      { new: true, upsert: true }
    );

    logger.info(`Hospital capacity updated: ${hospitalId}`);
    return res.json({ success: true, message: 'Capacity updated successfully', data: stats });
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
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const query: any = { hospitalId };
    if (status) query.status = status;

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .sort({ detectedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('driverId', 'name phone')
        .populate('responders.responderId', 'name'),
      Incident.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: { incidents, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } }
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
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const responders = await User.find({ hospitalId, role: 'responder', isActive: true })
      .select('name email phone responderType certifications experience currentLocation');

    const respondersWithStatus = responders.map((responder) => ({
      ...responder.toObject(),
      status: 'available',
      currentIncidentId: null,
    }));

    return res.json({ success: true, data: respondersWithStatus });
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
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const [incident, responder] = await Promise.all([
      Incident.findById(incidentId),
      User.findOne({ _id: responderId, hospitalId, role: 'responder' }),
    ]);

    if (!incident) return res.status(404).json({ success: false, error: 'Incident not found' });
    if (!responder) return res.status(404).json({ success: false, error: 'Responder not found' });

    const responderInfo = {
      responderId,                              // ✅ matches schema field name
      name: responder.name,
      type: (responder.responderType || 'ambulance') as any,
      hospital: hospitalId.toString(),
      eta: 10, distance: 5, status: 'dispatched' as any, dispatchedAt: new Date()
    };

    incident.responders.push(responderInfo as any);
    incident.status = 'dispatched';
    incident.hospitalId = hospitalId as any;
    await incident.save();

    logger.info(`Responder ${responderId} dispatched to incident ${incidentId}`);
    return res.json({ success: true, message: 'Responder dispatched successfully', data: { incident, responder: responderInfo } });
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
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case 'day':   startDate.setDate(startDate.getDate() - 1); break;
      case 'week':  startDate.setDate(startDate.getDate() - 7); break;
      case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
      case 'year':  startDate.setFullYear(startDate.getFullYear() - 1); break;
    }

    const incidents = await Incident.find({ hospitalId, detectedAt: { $gte: startDate, $lte: endDate } });
    const totalIncidents    = incidents.length;
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const avgResponseTime   = 15;

    const incidentsByDay = incidents.reduce((acc: any, incident) => {
      const day = incident.detectedAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        period, dateRange: { startDate, endDate },
        summary: { totalIncidents, resolvedIncidents, criticalIncidents, avgResponseTime },
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
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const hospital = await User.findByIdAndUpdate(
      hospitalId, { $set: { location: { lat, lng } } }, { new: true }
    ).select('name location');

    if (!hospital) return res.status(404).json({ success: false, error: 'Hospital not found' });

    logger.info(`Hospital location updated: ${hospitalId}`);
    return res.json({ success: true, message: 'Location updated successfully', data: hospital.location });
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
    const latitude     = parseFloat(lat as string);
    const longitude    = parseFloat(lng as string);
    const searchRadius = parseFloat(radius as string);

    const hospitals = await User.find({
      role: 'hospital', isActive: true,
      location: { $near: { $geometry: { type: 'Point', coordinates: [longitude, latitude] }, $maxDistance: searchRadius * 1000 } }
    }).select('hospitalName address phone location');

    const hospitalsWithStats = await Promise.all(
      hospitals.map(async (hospital) => {
        const stats = await HospitalStats.findOne({ hospitalId: hospital._id });
        return { ...hospital.toObject(), stats: stats || { beds: 0, ambulances: 0, responders: 0 } };
      })
    );

    return res.json({
      success: true,
      data: { hospitals: hospitalsWithStats, count: hospitalsWithStats.length, center: { lat: latitude, lng: longitude }, radius: searchRadius }
    });
  } catch (error: any) {
    logger.error('Get nearby hospitals error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
// ── Add these two exports at the bottom of hospital.controller.ts ──

/* ============================================================
   GET HOSPITAL BEDS
============================================================ */
export const getHospitalBeds = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const stats = await HospitalStats.findOne({ hospitalId });

    // Return ward breakdown if stored, otherwise return top-level bed counts
    // so the frontend can at least show total available vs total
    const wards = (stats as any)?.wards ?? [];

    // If no ward breakdown exists yet, build one from top-level fields
    if (wards.length === 0 && stats) {
      const totalBeds      = (stats as any).beds      ?? 0;
      const availableBeds  = (stats as any).availableBeds ?? 0;
      return res.json({
        success: true,
        data: totalBeds > 0 ? [
          {
            name:      'General',
            available: availableBeds,
            total:     totalBeds,
            category:  'general',
          },
        ] : [],
      });
    }

    return res.json({ success: true, data: wards });
  } catch (error: any) {
    logger.error('Get hospital beds error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ============================================================
   GET HOSPITAL SHIFTS
============================================================ */
export const getHospitalShifts = async (req: AuthRequest, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    if (!hospitalId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const responders = await User.find({
      hospitalId,
      role: 'responder',
      isActive: true,
    }).select('name responderType responderStatus shiftStart shiftEnd');

    const data = responders.map((r: any) => ({
      _id:        r._id.toString(),
      name:       r.name,
      role:       r.responderType ?? 'Responder',
      shiftStart: r.shiftStart ?? null,
      shiftEnd:   r.shiftEnd   ?? null,
      status:     r.responderStatus?.isAvailable === false
                    ? (r.responderStatus?.currentIncidentId ? 'responding' : 'off-duty')
                    : 'on-duty',
      assignedIncident: r.responderStatus?.currentIncidentId ?? undefined,
    }));

    return res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Get hospital shifts error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};