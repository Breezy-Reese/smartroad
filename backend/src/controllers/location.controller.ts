import { Request, Response } from 'express';
import { Location } from '../models/Location.model';
import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { logger } from '../utils/logger';
import { locationService } from '../services/location.service';

/* ============================================================
   UPDATE LOCATION
============================================================ */
export const updateLocation = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user?._id;

    if (!driverId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const driver = await User.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    const {
      latitude,
      longitude,
      speed = 0,
      accuracy,
      heading,
      altitude,
      altitudeAccuracy,
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude required',
      });
    }

    const location = await Location.create({
      driverId,
      driverName: driver.name,
      vehicleId: driver.vehicleId,
      vehicleNumber: driver.vehicleNumber,
      latitude,
      longitude,
      speed,
      accuracy,
      heading,
      altitude,
      altitudeAccuracy,
      timestamp: new Date(),
      status: speed > 5 ? 'driving' : speed > 0 ? 'idle' : 'stopped',
    });

    const activeIncident = await Incident.findOne({
      driverId,
      status: { $in: ['pending', 'detected', 'confirmed', 'dispatched', 'en-route'] },
    });

    const io = req.app.get('io');

    if (activeIncident) {
      activeIncident.location = { lat: latitude, lng: longitude };
      await activeIncident.save();

      if (activeIncident.responders?.length) {
        for (const responder of activeIncident.responders) {
          if (!responder?.id || responder.status !== 'en-route') continue;

          const eta = locationService.calculateETA(
            { lat: latitude, lng: longitude },
            responder.location
          );

          io?.to(`responder-${responder.id}`).emit('driver-location-update', {
            incidentId: activeIncident._id,
            location: { lat: latitude, lng: longitude },
            eta,
          });
        }
      }
    }

    io?.emit('location-update', {
      driverId,
      driverName: driver.name,
      latitude,
      longitude,
      speed,
      timestamp: location.timestamp,
      status: location.status,
    });

    return res.json({ success: true, data: location });
  } catch (error: any) {
    logger.error('Update location error', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update location',
    });
  }
};

/* ============================================================
   GET DRIVER LOCATION
============================================================ */
export const getDriverLocation = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const location = await Location.findOne({ driverId })
      .sort({ timestamp: -1 });

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'No location found',
      });
    }

    return res.json({ success: true, data: location });
  } catch (error: any) {
    logger.error('Get driver location error', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch location',
    });
  }
};

/* ============================================================
   GET DRIVER HISTORY
============================================================ */
export const getDriverHistory = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    const query: any = { driverId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const history = await Location.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    return res.json({ success: true, data: history });
  } catch (error: any) {
    logger.error('Get driver history error', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch history',
    });
  }
};

/* ============================================================
   GET NEARBY DRIVERS (FIXED AGGREGATION)
============================================================ */
export const getNearbyDrivers = async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude required',
      });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const drivers = await Location.aggregate([
      { $match: { timestamp: { $gte: fiveMinutesAgo } } },
      { $sort: { timestamp: -1 } }, // ✅ FIX: Ensure $first works properly
      {
        $group: {
          _id: '$driverId',
          latestLocation: { $first: '$$ROOT' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $unwind: '$driver' },
      {
        $project: {
          driverId: '$_id',
          driverName: '$driver.name',
          driverPhone: '$driver.phone',
          vehicleNumber: '$latestLocation.vehicleNumber',
          location: {
            lat: '$latestLocation.latitude',
            lng: '$latestLocation.longitude',
          },
          speed: '$latestLocation.speed',
          status: '$latestLocation.status',
          lastUpdate: '$latestLocation.timestamp',
        },
      },
      { $sort: { lastUpdate: -1 } },
    ]);

    return res.json({ success: true, data: drivers });
  } catch (error: any) {
    logger.error('Get nearby drivers error', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get nearby drivers',
    });
  }
};

/* ============================================================
   GET ACTIVE DRIVERS
============================================================ */
export const getActiveDrivers = async (_req: Request, res: Response) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeDrivers = await Location.aggregate([
      { $match: { timestamp: { $gte: fiveMinutesAgo } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$driverId',
          latestLocation: { $first: '$$ROOT' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $unwind: '$driver' },
      {
        $project: {
          driverId: '$_id',
          driverName: '$driver.name',
          driverPhone: '$driver.phone',
          vehicleNumber: '$latestLocation.vehicleNumber',
          location: {
            lat: '$latestLocation.latitude',
            lng: '$latestLocation.longitude',
          },
          speed: '$latestLocation.speed',
          status: '$latestLocation.status',
          lastUpdate: '$latestLocation.timestamp',
        },
      },
      { $sort: { lastUpdate: -1 } },
    ]);

    return res.json({ success: true, data: activeDrivers });
  } catch (error: any) {
    logger.error('Get active drivers error', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active drivers',
    });
  }
};