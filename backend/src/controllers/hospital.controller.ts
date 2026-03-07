import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/Responder.model';
import { logger } from '../utils/logger';
import { locationService } from '../services/location.service';
import { notificationService } from '../services/notification.service';

/* ============================================================
   DASHBOARD
============================================================ */

export const getHospitalDashboard = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;

    if (!hospitalId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    let stats = await HospitalStats.findOne({ hospitalId });

    if (!stats) {
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

    const recentIncidents = await Incident.find({ hospitalId })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('driverId', 'name phone');

    const responderIds = await User.find({
      role: 'responder',
      hospitalId,
    }).distinct('_id');

    const activeResponders = await ResponderStatus.find({
      responderId: { $in: responderIds },
      status: { $in: ['available', 'en-route'] },
    }).populate({
      path: 'responderId',
      select: 'name phone responderType',
    });

    res.json({
      success: true,
      data: {
        stats,
        recentIncidents,
        activeResponders,
      },
    });
  } catch (error) {
    logger.error('Hospital dashboard error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to load dashboard',
    });
  }
};

/* ============================================================
   UPDATE CAPACITY
============================================================ */

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

    const io = req.app.get('io');
    io?.emit('hospital-stats-update', { hospitalId, stats });

    return res.json({
      success: true,
      message: 'Hospital capacity updated',
      data: stats,
    });
  } catch (error) {
    logger.error('Update capacity error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to update capacity',
    });
  }
};

/* ============================================================
   GET INCIDENTS
============================================================ */

export const getHospitalIncidents = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;
    const { status, page = 1, limit = 20 } = req.query;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const query: any = { hospitalId };

    if (status) query.status = status;

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    const incidents = await Incident.find(query)
      .sort({ timestamp: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate('driverId', 'name phone');

    const total = await Incident.countDocuments(query);

    return res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total,
          pages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    logger.error('Get hospital incidents error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch incidents',
    });
  }
};

/* ============================================================
   GET AVAILABLE RESPONDERS
============================================================ */

export const getAvailableResponders = async (req: Request, res: Response) => {
  try {
    const hospitalId = req.user?._id;

    const responders = await User.find({
      role: 'responder',
      hospitalId,
      isActive: true,
    }).select('name phone responderType isAvailable');

    const statuses = await ResponderStatus.find({
      responderId: { $in: responders.map(r => r._id) },
    });

    const data = responders.map(responder => {
      const status = statuses.find(
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

    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Available responders error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get responders',
    });
  }
};

/* ============================================================
   DISPATCH RESPONDER
============================================================ */

export const dispatchResponder = async (req: Request, res: Response) => {
  try {
    const { incidentId, responderId } = req.body;
    const hospitalId = req.user?._id;

    if (!hospitalId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const responder = await User.findOne({
      _id: responderId,
      role: 'responder',
      hospitalId,
    });

    if (!responder) {
      return res.status(404).json({ success: false, error: 'Responder not found' });
    }

    const responderStatus = await ResponderStatus.findOne({ responderId });

    if (!responderStatus || !responderStatus.isAvailable) {
      return res.status(400).json({
        success: false,
        error: 'Responder not available',
      });
    }

    const eta = locationService.calculateETA(
      responderStatus.currentLocation,
      incident.location
    );

    const distance = locationService.calculateDistance(
      responderStatus.currentLocation,
      incident.location
    );

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

    responderStatus.isAvailable = false;
    responderStatus.currentIncidentId = incident._id;
    responderStatus.status = 'en-route';
    await responderStatus.save();

    const io = req.app.get('io');

    io?.to(`responder-${responderId}`).emit('incident-assigned', {
      incidentId: incident._id,
      location: incident.location,
      eta,
    });

    io?.to(`driver-${incident.driverId}`).emit('responder-dispatched', {
      incidentId: incident._id,
      responder: responderInfo,
    });

    await notificationService.sendSMS({
      to: incident.driverPhone || '',
      message: `Responder ${responder.name} dispatched. ETA: ${eta} minutes.`,
    });

    return res.json({
      success: true,
      message: 'Responder dispatched',
      data: { incident, responder: responderInfo },
    });
  } catch (error) {
    logger.error('Dispatch responder error', error);

    return res.status(500).json({
      success: false,
      error: 'Dispatch failed',
    });
  }
};