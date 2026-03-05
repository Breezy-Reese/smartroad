import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/Responder.model';
import { logger } from '../utils/logger';
import { locationService } from '../services/location.service';
import { notificationService } from '../services/notification.service';

export const getHospitalDashboard = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;

    // Get hospital stats
    let stats = await HospitalStats.findOne({ hospitalId });
    
    if (!stats) {
      // Create initial stats if not exists
      stats = new HospitalStats({
        hospitalId,
        totalIncidents: 0,
        activeIncidents: 0,
        resolvedIncidents: 0,
        averageResponseTime: 0,
        availableBeds: 0,
        availableAmbulances: 0,
        availableResponders: 0,
      });
      await stats.save();
    }

    // Get recent incidents
    const recentIncidents = await Incident.find({ hospitalId })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('driverId', 'name phone');

    // Get active responders
    const activeResponders = await ResponderStatus.find({
      responderId: { $in: await User.find({ role: 'responder', hospitalId }).distinct('_id') },
      status: { $in: ['available', 'en-route'] },
    }).populate({
      path: 'responderId',
      select: 'name phone responderType',
    });

    // Get pending incidents in area
    const hospital = await User.findById(hospitalId);
    const nearbyIncidents = hospital?.location ? await Incident.find({
      status: 'pending',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [hospital.location.lng, hospital.location.lat],
          },
          $maxDistance: 20000, // 20km
        },
      },
    }).limit(20) : [];

    res.json({
      success: true,
      data: {
        stats,
        recentIncidents,
        activeResponders,
        nearbyIncidents,
      },
    });
  } catch (error) {
    logger.error('Get hospital dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hospital dashboard',
    });
  }
};

export const updateHospitalCapacity = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { beds, ambulances, responders } = req.body;

    const stats = await HospitalStats.findOneAndUpdate(
      { hospitalId },
      {
        $set: {
          availableBeds: beds,
          availableAmbulances: ambulances,
          availableResponders: responders,
          lastUpdated: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    // Emit update via socket
    const io = req.app.get('io');
    io.emit('hospital-stats-update', {
      hospitalId,
      stats,
    });

    res.json({
      success: true,
      data: stats,
      message: 'Hospital capacity updated successfully',
    });
  } catch (error) {
    logger.error('Update hospital capacity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hospital capacity',
    });
  }
};

export const getHospitalIncidents = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = { hospitalId };
    
    if (status) {
      query.status = status;
    }

    const incidents = await Incident.find(query)
      .sort({ timestamp: -1 })
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string))
      .populate('driverId', 'name phone');

    const total = await Incident.countDocuments(query);

    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error('Get hospital incidents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hospital incidents',
    });
  }
};

export const getAvailableResponders = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;

    const responders = await User.find({
      role: 'responder',
      hospitalId,
      isActive: true,
    }).select('name phone responderType isAvailable');

    const responderStatuses = await ResponderStatus.find({
      responderId: { $in: responders.map(r => r._id) },
    });

    const respondersWithStatus = responders.map(responder => {
      const status = responderStatuses.find(
        s => s.responderId.toString() === responder._id.toString()
      );
      return {
        ...responder.toJSON(),
        currentStatus: status?.status || 'available',
        currentLocation: status?.currentLocation,
        currentIncidentId: status?.currentIncidentId,
        lastUpdate: status?.lastUpdate,
      };
    });

    res.json({
      success: true,
      data: respondersWithStatus,
    });
  } catch (error) {
    logger.error('Get available responders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available responders',
    });
  }
};

export const dispatchResponder = async (req: Request, res: Response) => {
  try {
    const { incidentId, responderId } = req.body;
    const hospitalId = req.user?._id;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
      });
    }

    const responder = await User.findOne({
      _id: responderId,
      role: 'responder',
      hospitalId,
    });

    if (!responder) {
      return res.status(404).json({
        success: false,
        error: 'Responder not found',
      });
    }

    // Get responder's current location
    const responderStatus = await ResponderStatus.findOne({ responderId });
    
    if (!responderStatus || !responderStatus.isAvailable) {
      return res.status(400).json({
        success: false,
        error: 'Responder is not available',
      });
    }

    // Calculate ETA
    const eta = locationService.calculateETA(
      responderStatus.currentLocation,
      incident.location
    );

    const distance = locationService.calculateDistance(
      responderStatus.currentLocation,
      incident.location
    );

    // Add responder to incident
    const responderInfo = {
      id: responderId,
      name: responder.name,
      type: responder.responderType,
      hospital: hospitalId.toString(),
      eta,
      distance,
      status: 'dispatched',
      location: responderStatus.currentLocation,
      dispatchedAt: new Date(),
    };

    incident.responders.push(responderInfo);
    incident.status = 'dispatched';
    await incident.save();

    // Update responder status
    responderStatus.isAvailable = false;
    responderStatus.currentIncidentId = incident._id;
    responderStatus.status = 'en-route';
    await responderStatus.save();

    // Update hospital stats
    await HospitalStats.findOneAndUpdate(
      { hospitalId },
      {
        $inc: { 
          availableResponders: -1,
          availableAmbulances: responder.responderType === 'ambulance' ? -1 : 0,
        },
      }
    );

    // Emit socket events
    const io = req.app.get('io');
    
    io.to(`responder-${responderId}`).emit('incident-assigned', {
      incidentId: incident._id,
      location: incident.location,
      driverName: incident.driverName,
      eta,
    });

    io.to(`driver-${incident.driverId}`).emit('responder-dispatched', {
      incidentId: incident._id,
      responder: responderInfo,
    });

    // Send SMS notification to driver
    await notificationService.sendSMS({
      to: incident.driverPhone || '',
      message: `Emergency responder ${responder.name} has been dispatched to your location. ETA: ${eta} minutes.`,
    });

    res.json({
      success: true,
      data: {
        incident,
        responder: responderInfo,
      },
      message: 'Responder dispatched successfully',
    });
  } catch (error) {
    logger.error('Dispatch responder error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dispatch responder',
    });
  }
};

export const getHospitalAnalytics = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { period = 'month' } = req.query;

    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get incidents in period
    const incidents = await Incident.find({
      hospitalId,
      timestamp: { $gte: startDate },
    });

    // Calculate metrics
    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved').length;
    const averageResponseTime = incidents.reduce((acc, inc) => {
      const firstResponder = inc.responders[0];
      if (firstResponder && firstResponder.arrivedAt) {
        const responseTime = (new Date(firstResponder.arrivedAt).getTime() - new Date(inc.detectedAt).getTime()) / 60000;
        return acc + responseTime;
      }
      return acc;
    }, 0) / (incidents.filter(i => i.responders.length > 0).length || 1);

    // Group by day for trend
    const trend = incidents.reduce((acc: any, inc) => {
      const date = inc.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          avgResponseTime: 0,
          totalResponseTime: 0,
        };
      }
      acc[date].count++;
      
      const firstResponder = inc.responders[0];
      if (firstResponder && firstResponder.arrivedAt) {
        const responseTime = (new Date(firstResponder.arrivedAt).getTime() - new Date(inc.detectedAt).getTime()) / 60000;
        acc[date].totalResponseTime += responseTime;
      }
      
      return acc;
    }, {});

    Object.values(trend).forEach((day: any) => {
      day.avgResponseTime = day.count > 0 ? day.totalResponseTime / day.count : 0;
      delete day.totalResponseTime;
    });

    // Get responder performance
    const responderPerformance = await Incident.aggregate([
      {
        $match: { hospitalId: hospitalId?._id },
      },
      {
        $unwind: '$responders',
      },
      {
        $group: {
          _id: '$responders.id',
          name: { $first: '$responders.name' },
          totalIncidents: { $sum: 1 },
          averageEta: { $avg: '$responders.eta' },
          averageResponseTime: {
            $avg: {
              $cond: [
                { $ne: ['$responders.arrivedAt', null] },
                {
                  $divide: [
                    { $subtract: ['$responders.arrivedAt', '$detectedAt'] },
                    60000,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        period,
        totalIncidents,
        resolvedIncidents,
        unresolvedIncidents: totalIncidents - resolvedIncidents,
        averageResponseTime: Math.round(averageResponseTime * 10) / 10,
        trend: Object.values(trend).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        responderPerformance,
      },
    });
  } catch (error) {
    logger.error('Get hospital analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hospital analytics',
    });
  }
};

export const updateHospitalLocation = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { lat, lng } = req.body;

    const hospital = await User.findByIdAndUpdate(
      hospitalId,
      {
        location: { lat, lng },
      },
      { new: true }
    );

    res.json({
      success: true,
      data: hospital?.location,
      message: 'Hospital location updated successfully',
    });
  } catch (error) {
    logger.error('Update hospital location error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hospital location',
    });
  }
};

export const getNearbyHospitals = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    const hospitals = await User.find({
      role: 'hospital',
      isActive: true,
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          $maxDistance: parseInt(radius as string) * 1000,
        },
      },
    }).select('hospitalName location contactNumber capacity');

    const hospitalsWithStats = await Promise.all(
      hospitals.map(async (hospital) => {
        const stats = await HospitalStats.findOne({ hospitalId: hospital._id });
        const distance = locationService.calculateDistance(
          { lat: parseFloat(lat as string), lng: parseFloat(lng as string) },
          hospital.location
        );

        return {
          ...hospital.toJSON(),
          distance: Math.round(distance * 10) / 10,
          stats: stats || {
            availableBeds: 0,
            availableAmbulances: 0,
            availableResponders: 0,
          },
        };
      })
    );

    res.json({
      success: true,
      data: hospitalsWithStats.sort((a, b) => a.distance - b.distance),
    });
  } catch (error) {
    logger.error('Get nearby hospitals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nearby hospitals',
    });
  }
};