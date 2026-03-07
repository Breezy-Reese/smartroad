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
    const {
      latitude,
      longitude,
      speed = 0,
      accuracy,
      heading,
      altitude,
      altitudeAccuracy,
    } = req.body;

    const driverId = req.user?._id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const driver = await User.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    const location = new Location({
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

    await location.save();

    const activeIncident = await Incident.findOne({
      driverId,
      status: {
        $in: [
          'pending',
          'detected',
          'confirmed',
          'dispatched',
          'en-route',
        ],
      },
    });

    const io = req.app.get('io');

    if (activeIncident) {
      activeIncident.location = {
        lat: latitude,
        lng: longitude,
      };

      await activeIncident.save();

      if (activeIncident.responders?.length) {
        activeIncident.responders.forEach((r: any) => {
          if (r?.status === 'en-route' && r?.location) {
            const eta = locationService.calculateETA(
              { lat: latitude, lng: longitude },
              {
                lat: r.location.lat,
                lng: r.location.lng,
              }
            );

            io?.to(`responder-${r.id}`).emit('driver-location-update', {
              incidentId: activeIncident._id,
              location: { lat: latitude, lng: longitude },
              eta,
            });
          }
        });
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

    return res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    logger.error('Update location error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to update location',
    });
  }
};

/* ============================================================
   GET DRIVER LOCATION
============================================================ */

export const getDriverLocation = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const location = await Location.findOne({ driverId }).sort({
      timestamp: -1,
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'No location found',
      });
    }

    return res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    logger.error('Get driver location error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get driver location',
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
      if (startDate)
        query.timestamp.$gte = new Date(startDate as string);
      if (endDate)
        query.timestamp.$lte = new Date(endDate as string);
    }

    const locations = await Location.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    return res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    logger.error('Get driver history error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
    });
  }
};

/* ============================================================
   GET NEARBY DRIVERS
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
      {
        $match: {
          timestamp: { $gte: fiveMinutesAgo },
        },
      },
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

    return res.json({
      success: true,
      data: drivers,
    });
  } catch (error) {
    logger.error('Get nearby drivers error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get nearby drivers',
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
      {
        $match: {
          timestamp: { $gte: fiveMinutesAgo },
        },
      },
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

    return res.json({
      success: true,
      data: activeDrivers,
    });
  } catch (error) {
    logger.error('Get active drivers error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get active drivers',
    });
  }
};

/* ============================================================
   CREATE GEOFENCE (ADMIN ONLY)
============================================================ */

export const createGeofence = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    const geofence = {
      ...req.body,
      createdBy: req.user._id,
      createdAt: new Date(),
    };

    const io = req.app.get('io');
    io?.emit('geofence-update', geofence);

    return res.status(201).json({
      success: true,
      data: geofence,
    });
  } catch (error) {
    logger.error('Create geofence error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to create geofence',
    });
  }
};

/* ============================================================
   CHECK GEOFENCE VIOLATIONS
============================================================ */

export const checkGeofenceViolations = async (
  req: Request,
  res: Response
) => {
  try {
    const { driverId } = req.params;

    const currentLocation = await Location.findOne({ driverId }).sort({
      timestamp: -1,
    });

    if (!currentLocation) {
      return res.status(404).json({
        success: false,
        error: 'No location found',
      });
    }

    return res.json({
      success: true,
      data: {
        location: currentLocation,
        violations: [],
      },
    });
  } catch (error) {
    logger.error('Geofence violation error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to check violations',
    });
  }
};