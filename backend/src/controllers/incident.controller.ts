import { Request, Response } from 'express';
import { Incident } from '../models/Incident.model';
import { User } from '../models/User.model';
import { HospitalStats } from '../models/Hospital.model';
import { ResponderStatus } from '../models/Responder.model';
import { notificationService } from '../services/notification.service';
import { locationService } from '../services/location.service';
import { logger } from '../utils/logger';
import { ICreateIncidentDTO, IAcceptIncidentDTO } from '../types/incident.types';

export const createIncident = async (req: Request, res: Response) => {
  try {
    const incidentData: ICreateIncidentDTO = req.body;

    // Generate incident ID
    const incident = new Incident({
      ...incidentData,
      driverId: req.user?._id,
      detectedAt: new Date(),
    });

    await incident.save();

    // Get driver details for notifications
    const driver = await User.findById(incident.driverId);
    
    // Notify emergency contacts
    if (driver?.emergencyContacts && driver.emergencyContacts.length > 0) {
      await notificationService.notifyEmergencyContacts(
        driver.emergencyContacts,
        incident
      );
    }

    // Find and notify nearby hospitals
    const nearbyHospitals = await locationService.findNearbyHospitals(
      incident.location,
      10 // 10km radius
    );

    // Emit socket event for new incident
    const io = req.app.get('io');
    io.emit('new-incident', incident);

    // Notify nearby hospitals via socket
    nearbyHospitals.forEach(hospital => {
      io.to(`hospital-${hospital.id}`).emit('emergency-alert', {
        incidentId: incident._id,
        driverName: incident.driverName,
        location: incident.location,
        severity: incident.severity,
      });
    });

    // Send SMS to emergency number
    await notificationService.sendEmergencySMS({
      to: process.env.EMERGENCY_PHONE_NUMBER || '911',
      message: `EMERGENCY: Accident detected at ${incident.location.lat},${incident.location.lng}. Severity: ${incident.severity}`,
    });

    res.status(201).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    logger.error('Create incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incident',
    });
  }
};

export const getIncident = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findById(incidentId)
      .populate('driverId', 'name phone')
      .populate('hospitalId', 'name hospitalName');

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
      });
    }

    res.json({
      success: true,
      data: incident,
    });
  } catch (error) {
    logger.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incident',
    });
  }
};

export const getActiveIncidents = async (req: Request, res: Response) => {
  try {
    const { status, severity, lat, lng, radius } = req.query;

    const query: any = {};

    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['pending', 'detected', 'confirmed', 'dispatched', 'en-route'] };
    }

    if (severity) {
      query.severity = severity;
    }

    // Filter by location if coordinates provided
    if (lat && lng && radius) {
      const maxDistance = parseInt(radius as string) * 1000; // Convert to meters
      
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    const incidents = await Incident.find(query)
      .sort({ timestamp: -1 })
      .populate('driverId', 'name phone')
      .limit(50);

    res.json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    logger.error('Get active incidents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incidents',
    });
  }
};

export const updateIncidentStatus = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { status, notes } = req.body;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
      });
    }

    const oldStatus = incident.status;
    incident.status = status;
    incident.updatedBy = req.user?._id;

    if (status === 'resolved' || status === 'cancelled') {
      incident.resolvedAt = new Date();
    }

    if (status === 'confirmed') {
      incident.confirmedAt = new Date();
    }

    await incident.save();

    // Update hospital stats if applicable
    if (incident.hospitalId && (status === 'resolved' || status === 'cancelled')) {
      await HospitalStats.findOneAndUpdate(
        { hospitalId: incident.hospitalId },
        { 
          $inc: { 
            activeIncidents: -1,
            resolvedIncidents: status === 'resolved' ? 1 : 0,
          },
          $set: { lastUpdated: new Date() },
        }
      );
    }

    // Emit socket event
    const io = req.app.get('io');
    io.emit('incident-update', incident);

    // Notify relevant parties
    if (oldStatus !== status) {
      if (incident.hospitalId) {
        io.to(`hospital-${incident.hospitalId}`).emit('incident-update', incident);
      }
      
      incident.responders.forEach(responder => {
        io.to(`responder-${responder.id}`).emit('incident-update', incident);
      });
    }

    res.json({
      success: true,
      data: incident,
    });
  } catch (error) {
    logger.error('Update incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update incident',
    });
  }
};

export const acceptIncident = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const acceptData: IAcceptIncidentDTO = req.body;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
      });
    }

    // Add responder to incident
    const responderInfo = {
      id: acceptData.responderId,
      name: acceptData.responderName,
      type: 'ambulance',
      hospital: acceptData.hospitalId,
      eta: acceptData.eta,
      distance: acceptData.distance,
      status: 'dispatched',
      dispatchedAt: new Date(),
    };

    incident.responders.push(responderInfo);
    incident.status = 'dispatched';
    incident.hospitalId = acceptData.hospitalId as any;

    await incident.save();

    // Update hospital stats
    await HospitalStats.findOneAndUpdate(
      { hospitalId: acceptData.hospitalId },
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

    // Update responder status
    await ResponderStatus.findOneAndUpdate(
      { responderId: acceptData.responderId },
      {
        isAvailable: false,
        currentIncidentId: incident._id,
        status: 'en-route',
        lastUpdate: new Date(),
      },
      { upsert: true }
    );

    // Emit socket events
    const io = req.app.get('io');
    
    // Notify driver
    io.to(`driver-${incident.driverId}`).emit('responder-accepted', {
      incidentId: incident._id,
      responder: responderInfo,
    });

    // Broadcast to all hospitals
    io.emit('responder-accepted', {
      incidentId: incident._id,
      responder: responderInfo,
      hospitalId: acceptData.hospitalId,
    });

    res.json({
      success: true,
      data: incident,
    });
  } catch (error) {
    logger.error('Accept incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept incident',
    });
  }
};

export const getUserIncidents = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const incidents = await Incident.find({ driverId: userId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    logger.error('Get user incidents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user incidents',
    });
  }
};

export const getIncidentStats = async (req: Request, res: Response) => {
  try {
    const stats = await Incident.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'detected', 'confirmed', 'dispatched', 'en-route']] },
                1,
                0,
              ],
            },
          },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0],
            },
          },
          bySeverity: {
            $push: '$severity',
          },
        },
      },
    ]);

    const bySeverity = await Incident.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
    ]);

    const byType = await Incident.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const averageResponseTime = await Incident.aggregate([
      {
        $match: {
          'responders.0': { $exists: true },
        },
      },
      {
        $unwind: '$responders',
      },
      {
        $group: {
          _id: null,
          avgResponseTime: {
            $avg: {
              $subtract: ['$responders.arrivedAt', '$detectedAt'],
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        total: stats[0]?.total || 0,
        active: stats[0]?.active || 0,
        resolved: stats[0]?.resolved || 0,
        bySeverity: bySeverity.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byType: byType.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        averageResponseTime: averageResponseTime[0]?.avgResponseTime || 0,
      },
    });
  } catch (error) {
    logger.error('Get incident stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incident stats',
    });
  }
};