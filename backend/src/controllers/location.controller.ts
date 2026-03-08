import { Request, Response } from 'express';
import { Location } from '../models/Location.model';
import { User } from '../models/User.model';
import { Incident } from '../models/Incident.model';
import { Geofence } from '../models/Geofence.model';
import { GeofenceViolation } from '../models/GeofenceViolation.model';
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
      altitudeAccuracy
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude required' });
    }

    // Create new location entry
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
      status: speed > 5 ? 'driving' : speed > 0 ? 'idle' : 'stopped'
    });

  // Find active incident
const activeIncident = await Incident.findOne({
  driverId,
  status: { $in: ['pending', 'detected', 'confirmed', 'dispatched', 'en-route'] }
});

const io = req.app.get('io');

if (activeIncident) {
  // Update incident location using type assertion
  (activeIncident as any).location = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };

  await activeIncident.save();

  // Notify responders
  if (activeIncident.responders?.length) {
    for (const responder of activeIncident.responders) {
if (!responder?.responderId || responder.status !== 'en-route' || !responder.location) continue;
      const eta = locationService.calculateETA(
        { lat: latitude, lng: longitude },
        responder.location
      );

io?.to(`responder-${responder.responderId}`).emit('driver-location-update', {        incidentId: activeIncident._id,
        location: { lat: latitude, lng: longitude },
        eta
      });
    }
  }
} // <-- This closes the if (activeIncident) block

// Check geofence violations
await checkGeofenceForDriver(driverId, { lat: latitude, lng: longitude });

// Emit location update to front-end
io?.emit('location-update', {
  driverId,
  driverName: driver.name,
  latitude,
  longitude,
  speed,
  timestamp: location.timestamp,
  status: location.status
});

return res.json({ success: true, data: location });
  } catch (error: any) {
    logger.error('Update location error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update location' });
  }
};

/* ============================================================
   GET DRIVER LOCATION
============================================================ */
export const getDriverLocation = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const location = await Location.findOne({ driverId }).sort({ timestamp: -1 });

    if (!location) {
      return res.status(404).json({ success: false, error: 'No location found' });
    }

    return res.json({ success: true, data: location });
  } catch (error: any) {
    logger.error('Get driver location error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch location' });
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
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch history' });
  }
};

/* ============================================================
   GET NEARBY DRIVERS
============================================================ */
export const getNearbyDrivers = async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude required' });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const drivers = await Location.aggregate([
      { $match: { timestamp: { $gte: fiveMinutesAgo } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$driverId', latestLocation: { $first: '$$ROOT' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'driver' } },
      { $unwind: '$driver' },
      {
        $project: {
          driverId: '$_id',
          driverName: '$driver.name',
          driverPhone: '$driver.phone',
          vehicleNumber: '$latestLocation.vehicleNumber',
          location: { lat: '$latestLocation.latitude', lng: '$latestLocation.longitude' },
          speed: '$latestLocation.speed',
          status: '$latestLocation.status',
          lastUpdate: '$latestLocation.timestamp'
        }
      },
      { $sort: { lastUpdate: -1 } }
    ]);

    return res.json({ success: true, data: drivers });
  } catch (error: any) {
    logger.error('Get nearby drivers error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get nearby drivers' });
  }
};

/* ============================================================
   GET ACTIVE DRIVERS
============================================================ */
export const getActiveDrivers = async (req: Request, res: Response) => {
  try {
    const { timeframe = 5 } = req.query;
    const timeLimit = new Date(Date.now() - (parseInt(timeframe as string) * 60 * 1000));

    const activeDrivers = await Location.aggregate([
      { $match: { timestamp: { $gte: timeLimit } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$driverId', latestLocation: { $first: '$$ROOT' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'driver' } },
      { $unwind: '$driver' },
      {
        $project: {
          driverId: '$_id',
          driverName: '$driver.name',
          driverPhone: '$driver.phone',
          vehicleNumber: '$latestLocation.vehicleNumber',
          location: { lat: '$latestLocation.latitude', lng: '$latestLocation.longitude' },
          speed: '$latestLocation.speed',
          status: '$latestLocation.status',
          lastUpdate: '$latestLocation.timestamp'
        }
      },
      { $sort: { lastUpdate: -1 } }
    ]);

    return res.json({ success: true, data: activeDrivers });
  } catch (error: any) {
    logger.error('Get active drivers error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get active drivers' });
  }
};

/* ============================================================
   GET DRIVER STATUS
============================================================ */
export const getDriverStatus = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const lastLocation = await Location.findOne({ driverId })
      .sort({ timestamp: -1 });

    if (!lastLocation) {
      return res.json({
        success: true,
        data: {
          driverId,
          status: 'offline',
          lastSeen: null
        }
      });
    }

    const minutesSinceUpdate = (Date.now() - lastLocation.timestamp.getTime()) / (1000 * 60);
    const status = minutesSinceUpdate < 5 ? 'online' : 'offline';

    return res.json({
      success: true,
      data: {
        driverId,
        status,
        lastSeen: lastLocation.timestamp,
        location: {
          lat: lastLocation.latitude,
          lng: lastLocation.longitude
        },
        speed: lastLocation.speed
      }
    });
  } catch (error: any) {
    logger.error('Get driver status error', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get driver status' });
  }
};

/* ============================================================
   GEOFENCE METHODS
============================================================ */

export const createGeofence = async (req: Request, res: Response) => {
  try {
    const geofenceData = req.body;
    geofenceData.createdBy = (req as any).user?._id;

    const geofence = await Geofence.create(geofenceData);

    logger.info(`Geofence created: ${geofence.name}`);

    return res.status(201).json({
      success: true,
      message: 'Geofence created successfully',
      data: geofence
    });
  } catch (error: any) {
    logger.error('Create geofence error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create geofence'
    });
  }
};

export const getGeofences = async (req: Request, res: Response) => {
  try {
    const { enabled, type, page = 1, limit = 20 } = req.query;
    
    const query: any = {};
    
    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }
    
    if (type) {
      query.type = type;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const geofences = await Geofence.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Geofence.countDocuments(query);

    return res.json({
      success: true,
      data: {
        geofences,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error: any) {
    logger.error('Get geofences error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch geofences'
    });
  }
};

export const getGeofenceById = async (req: Request, res: Response) => {
  try {
    const { geofenceId } = req.params;

    const geofence = await Geofence.findById(geofenceId);

    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: 'Geofence not found'
      });
    }

    return res.json({
      success: true,
      data: geofence
    });
  } catch (error: any) {
    logger.error('Get geofence by ID error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch geofence'
    });
  }
};

export const updateGeofence = async (req: Request, res: Response) => {
  try {
    const { geofenceId } = req.params;
    const updates = req.body;

    const geofence = await Geofence.findByIdAndUpdate(
      geofenceId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: 'Geofence not found'
      });
    }

    logger.info(`Geofence updated: ${geofence.name}`);

    return res.json({
      success: true,
      message: 'Geofence updated successfully',
      data: geofence
    });
  } catch (error: any) {
    logger.error('Update geofence error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update geofence'
    });
  }
};

export const deleteGeofence = async (req: Request, res: Response) => {
  try {
    const { geofenceId } = req.params;

    const geofence = await Geofence.findByIdAndDelete(geofenceId);

    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: 'Geofence not found'
      });
    }

    // Also delete related violations
    await GeofenceViolation.deleteMany({ geofenceId });

    logger.info(`Geofence deleted: ${geofence.name}`);

    return res.json({
      success: true,
      message: 'Geofence deleted successfully'
    });
  } catch (error: any) {
    logger.error('Delete geofence error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete geofence'
    });
  }
};

export const checkGeofenceViolations = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { geofenceId } = req.query;

    // Get driver's latest location
    const latestLocation = await Location.findOne({ driverId })
      .sort({ timestamp: -1 });

    if (!latestLocation) {
      return res.status(404).json({
        success: false,
        error: 'No location found for this driver'
      });
    }

    // Build query for geofences
    const geofenceQuery: any = { enabled: true };
    if (geofenceId) {
      geofenceQuery._id = geofenceId;
    }

    const geofences = await Geofence.find(geofenceQuery);

    const violations = [];
    const driverLat = latestLocation.latitude;
    const driverLng = latestLocation.longitude;

    for (const geofence of geofences) {
      let isInside = false;

      if (geofence.type === 'circle' && geofence.center && geofence.radius) {
        const distance = calculateDistance(
          { lat: driverLat, lng: driverLng },
          { lat: geofence.center.coordinates[1], lng: geofence.center.coordinates[0] }
        );
        isInside = distance <= geofence.radius;
      } 
      else if (geofence.type === 'polygon' && geofence.points) {
        // Simplified polygon check - you'd need proper point-in-polygon algorithm
        isInside = false; // Placeholder
      }

      if (geofence.alertOnEntry && isInside) {
        violations.push({
          geofenceId: geofence._id,
          geofenceName: geofence.name,
          type: 'entry',
          timestamp: new Date(),
          location: { lat: driverLat, lng: driverLng }
        });
      } 
      else if (geofence.alertOnExit && !isInside) {
        violations.push({
          geofenceId: geofence._id,
          geofenceName: geofence.name,
          type: 'exit',
          timestamp: new Date(),
          location: { lat: driverLat, lng: driverLng }
        });
      }
    }

    return res.json({
      success: true,
      data: {
        driverId,
        location: { lat: driverLat, lng: driverLng },
        timestamp: latestLocation.timestamp,
        violations,
        count: violations.length
      }
    });
  } catch (error: any) {
    logger.error('Check geofence violations error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to check geofence violations'
    });
  }
};

export const getGeofenceViolations = async (req: Request, res: Response) => {
  try {
    const { driverId, geofenceId, startDate, endDate, page = 1, limit = 20, resolved } = req.query;

    const query: any = {};

    if (driverId) query.driverId = driverId;
    if (geofenceId) query.geofenceId = geofenceId;
    if (resolved !== undefined) query.resolved = resolved === 'true';

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const violations = await GeofenceViolation.find(query)
      .populate('driverId', 'name phone')
      .populate('geofenceId', 'name type')
      .sort({ timestamp: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await GeofenceViolation.countDocuments(query);

    return res.json({
      success: true,
      data: {
        violations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error: any) {
    logger.error('Get geofence violations error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch geofence violations'
    });
  }
};

/* ============================================================
   BATCH OPERATIONS
============================================================ */

export const batchUpdateLocations = async (req: Request, res: Response) => {
  try {
    const { locations } = req.body;

    const operations = locations.map((loc: any) => ({
      driverId: loc.driverId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      speed: loc.speed || 0,
      timestamp: loc.timestamp ? new Date(loc.timestamp) : new Date(),
      status: loc.speed > 5 ? 'driving' : loc.speed > 0 ? 'idle' : 'stopped'
    }));

    const result = await Location.insertMany(operations);

    logger.info(`Batch updated ${result.length} locations`);

    return res.json({
      success: true,
      message: `Updated ${result.length} locations`,
      data: { count: result.length }
    });
  } catch (error: any) {
    logger.error('Batch update locations error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch update locations'
    });
  }
};

/* ============================================================
   NEARBY USERS
============================================================ */

export const getNearbyUsers = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 10, role, limit = 50 } = req.query;
    
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const searchRadius = parseFloat(radius as string);
    const resultLimit = parseInt(limit as string);

    const query: any = {
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
    };

    if (role) {
      query.role = role;
    } else {
      query.role = { $in: ['driver', 'responder', 'hospital'] };
    }

    const users = await User.find(query)
      .select('name role phone location hospitalName responderType isActive')
      .limit(resultLimit);

    const usersWithDistance = await Promise.all(users.map(async (user) => {
      const userObject = (user as any).toObject ? (user as any).toObject() : user;
      const userLocation = userObject.location?.coordinates;
      let distance = null;
      
      if (userLocation) {
        distance = calculateDistance(
          { lat: latitude, lng: longitude },
          { lat: userLocation[1], lng: userLocation[0] }
        );
      }

      let status = 'unknown';
      if (userObject.role === 'driver') {
        const lastLocation = await Location.findOne({ driverId: userObject._id })
          .sort({ timestamp: -1 });
        
        if (lastLocation) {
          const minutesSinceUpdate = (Date.now() - lastLocation.timestamp.getTime()) / (1000 * 60);
          status = minutesSinceUpdate < 5 ? 'online' : 'offline';
        }
      }

      return {
        _id: userObject._id?.toString() || '',
        name: userObject.name || '',
        role: userObject.role || '',
        phone: userObject.role === 'driver' ? userObject.phone : undefined,
        hospitalName: userObject.hospitalName,
        responderType: userObject.responderType,
        location: userLocation ? {
          lat: userLocation[1],
          lng: userLocation[0]
        } : null,
        distance: distance !== null ? Math.round(distance * 10) / 10 : null,
        status: userObject.role === 'driver' ? status : undefined,
        isActive: userObject.isActive || false
      };
    }));

    usersWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

    return res.json({
      success: true,
      data: {
        users: usersWithDistance,
        count: usersWithDistance.length,
        center: { lat: latitude, lng: longitude },
        radius: searchRadius
      }
    });
  } catch (error: any) {
    logger.error('Get nearby users error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get nearby users' 
    });
  }
};
/* ============================================================
   HELPER FUNCTIONS
============================================================ */

async function checkGeofenceForDriver(driverId: string, location: { lat: number; lng: number }) {
  try {
    const geofences = await Geofence.find({ enabled: true });

    for (const geofence of geofences) {
      let isInside = false;

      if (geofence.type === 'circle' && geofence.center && geofence.radius) {
        const distance = calculateDistance(
          location,
          { lat: geofence.center.coordinates[1], lng: geofence.center.coordinates[0] }
        );
        isInside = distance <= geofence.radius;
      }

      if (isInside && geofence.alertOnEntry) {
        await GeofenceViolation.create({
          geofenceId: geofence._id,
          driverId,
          type: 'entry',
          location: {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          },
          timestamp: new Date()
        });
      } else if (!isInside && geofence.alertOnExit) {
        await GeofenceViolation.create({
          geofenceId: geofence._id,
          driverId,
          type: 'exit',
          location: {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          },
          timestamp: new Date()
        });
      }
    }
  } catch (error) {
    logger.error('Check geofence for driver error:', error);
  }
}

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