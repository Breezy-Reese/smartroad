import { Request, Response } from 'express';
import { Location } from '../models/Location.model';
import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { logger } from '../utils/logger';
import { locationService } from '../services/location.service';

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, speed, accuracy, heading, altitude, altitudeAccuracy } = req.body;
    const driverId = req.user?._id;

    // Get driver details
    const driver = await User.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
      });
    }

    // Create location record
    const location = new Location({
      driverId,
      driverName: driver.name,
      vehicleId: driver.vehicleId,
      vehicleNumber: driver.vehicleNumber,
      latitude,
      longitude,
      speed: speed || 0,
      accuracy,
      heading,
      altitude,
      altitudeAccuracy,
      timestamp: new Date(),
      status: speed > 5 ? 'driving' : speed > 0 ? 'idle' : 'stopped',
    });

    await location.save();

    // Check if driver has active incident
    const activeIncident = await Incident.findOne({
      driverId,
      status: { $in: ['pending', 'detected', 'confirmed', 'dispatched', 'en-route'] },
    });

    if (activeIncident) {
      // Update incident with latest location
      activeIncident.location = { lat: latitude, lng: longitude };
      await activeIncident.save();

      // Update responder ETA if any
      if (activeIncident.responders && activeIncident.responders.length > 0) {
        const io = req.app.get('io');
        activeIncident.responders.forEach(responder => {
          if (responder.status === 'en-route' && responder.location) {
            const eta = locationService.calculateETA(
              { lat: latitude, lng: longitude },
              { lat: responder.location.lat, lng: responder.location.lng }
            );
            
            io.to(`responder-${responder.id}`).emit('driver-location-update', {
              incidentId: activeIncident._id,
              location: { lat: latitude, lng: longitude },
              eta,
            });
          }
        });
      }
    }

    // Emit location update via socket
    const io = req.app.get('io');
    io.emit('location-update', {
      driverId,
      driverName: driver.name,
      latitude,
      longitude,
      speed,
      timestamp: location.timestamp,
      status: location.status,
    });

    res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    logger.error('Update location error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location',
    });
  }
};

export const getDriverLocation = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const location = await Location.findOne({ driverId })
      .sort({ timestamp: -1 });

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'No location found for driver',
      });
    }

    res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    logger.error('Get driver location error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get driver location',
    });
  }
};

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

    const locations = await Location.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string));

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    logger.error('Get driver history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get driver history',
    });
  }
};

export const getNearbyDrivers = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    // Get drivers with recent location updates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const nearbyDrivers = await Location.aggregate([
      {
        $match: {
          timestamp: { $gte: fiveMinutesAgo },
        },
      },
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          distanceField: 'distance',
          maxDistance: parseInt(radius as string) * 1000,
          spherical: true,
        },
      },
      {
        $group: {
          _id: '$driverId',
          latestLocation: { $first: '$$ROOT' },
          distance: { $first: '$distance' },
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
      {
        $unwind: '$driver',
      },
      {
        $project: {
          _id: 0,
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
          distance: { $round: ['$distance', 2] },
          lastUpdate: '$latestLocation.timestamp',
        },
      },
      {
        $sort: { distance: 1 },
      },
    ]);

    res.json({
      success: true,
      data: nearbyDrivers,
    });
  } catch (error) {
    logger.error('Get nearby drivers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nearby drivers',
    });
  }
};

export const getActiveDrivers = async (req: Request, res: Response) => {
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
      {
        $unwind: '$driver',
      },
      {
        $project: {
          _id: 0,
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
      {
        $sort: { lastUpdate: -1 },
      },
    ]);

    res.json({
      success: true,
      data: activeDrivers,
    });
  } catch (error) {
    logger.error('Get active drivers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active drivers',
    });
  }
};

export const createGeofence = async (req: Request, res: Response) => {
  try {
    const geofenceData = req.body;

    // Only admin can create geofences
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Save geofence to database (you'll need to create a Geofence model)
    // This is a placeholder - implement Geofence model as needed
    const geofence = {
      ...geofenceData,
      createdBy: req.user._id,
      createdAt: new Date(),
    };

    // Emit geofence update
    const io = req.app.get('io');
    io.emit('geofence-update', geofence);

    res.status(201).json({
      success: true,
      data: geofence,
      message: 'Geofence created successfully',
    });
  } catch (error) {
    logger.error('Create geofence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create geofence',
    });
  }
};

export const checkGeofenceViolations = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    // Get driver's current location
    const currentLocation = await Location.findOne({ driverId })
      .sort({ timestamp: -1 });

    if (!currentLocation) {
      return res.status(404).json({
        success: false,
        error: 'No location found for driver',
      });
    }

    // Check against active geofences (simplified - implement actual geofence checking)
    // This is a placeholder - implement proper geofence checking logic
    const violations: any[] = [];

    res.json({
      success: true,
      data: {
        location: currentLocation,
        violations,
      },
    });
  } catch (error) {
    logger.error('Check geofence violations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check geofence violations',
    });
  }
};