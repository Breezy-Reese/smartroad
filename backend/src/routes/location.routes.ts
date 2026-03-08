import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as locationController from '../controllers/location.controller';
import { authenticate, authorize, requireDriver } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { locationLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Validation rules
const locationUpdateValidation = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('speed')
    .optional()
    .isFloat({ min: 0 }).withMessage('Speed must be a positive number'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 }).withMessage('Accuracy must be a positive number'),
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 }).withMessage('Heading must be between 0 and 360'),
  body('altitude')
    .optional()
    .isFloat().withMessage('Altitude must be a number'),
  body('timestamp')
    .optional()
    .isISO8601().withMessage('Invalid timestamp format'),
];

const driverIdParamValidation = [
  param('driverId')
    .isMongoId().withMessage('Invalid driver ID format'),
];

const geofenceIdParamValidation = [
  param('geofenceId')
    .isMongoId().withMessage('Invalid geofence ID format'),
];

const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
    .toInt(),
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format')
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .toDate(),
];

const nearbyQueryValidation = [
  query('lat')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude')
    .toFloat(),
  query('lng')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
    .toFloat(),
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 50 }).withMessage('Radius must be between 0.1 and 50 km')
    .toFloat(),
  query('role')
    .optional()
    .isIn(['driver', 'responder', 'hospital']).withMessage('Invalid role'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
];

// ==================== LOCATION UPDATES ====================

// Location update (drivers only)
router.post('/update',
  authenticate,
  requireDriver,
  locationLimiter,
  validate(locationUpdateValidation),
  locationController.updateLocation
);

// ==================== DRIVER LOCATION ====================

// Get driver's current location
router.get('/driver/:driverId',
  authenticate,
  authorize('admin', 'hospital', 'responder'),
  validate(driverIdParamValidation),
  locationController.getDriverLocation
);

// Get driver's location history
router.get('/history/:driverId',
  authenticate,
  authorize('admin', 'hospital'),
  validate([...driverIdParamValidation, ...paginationValidation]),
  locationController.getDriverHistory
);

// ==================== NEARBY QUERIES ====================

// Get nearby drivers
router.get('/nearby/drivers',
  authenticate,
  authorize('hospital', 'admin', 'responder'),
  validate(nearbyQueryValidation),
  locationController.getNearbyDrivers
);

// Get nearby users (generic)
router.get('/nearby',
  authenticate,
  authorize('hospital', 'admin', 'responder'),
  validate(nearbyQueryValidation),
  locationController.getNearbyUsers
);

// ==================== ACTIVE DRIVERS ====================

// Get active drivers
router.get('/active/drivers',
  authenticate,
  authorize('hospital', 'admin', 'responder'),
  validate([
    query('timeframe')
      .optional()
      .isInt({ min: 1, max: 60 }).withMessage('Timeframe must be between 1 and 60 minutes')
      .toInt(),
  ]),
  locationController.getActiveDrivers
);

// Get driver online status
router.get('/status/:driverId',
  authenticate,
  validate(driverIdParamValidation),
  locationController.getDriverStatus
);

// ==================== GEOFENCE MANAGEMENT ====================

// Create geofence (admin only)
router.post('/geofence',
  authenticate,
  authorize('admin'),
  validate([
    body('name')
      .notEmpty().withMessage('Geofence name is required')
      .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters')
      .trim(),
    
    body('type')
      .isIn(['circle', 'polygon', 'rectangle']).withMessage('Invalid geofence type'),
    
    // Circle-specific fields
    body('center.lat')
      .if(body('type').equals('circle'))
      .notEmpty().withMessage('Center latitude is required for circle geofence')
      .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    
    body('center.lng')
      .if(body('type').equals('circle'))
      .notEmpty().withMessage('Center longitude is required for circle geofence')
      .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    
    body('radius')
      .if(body('type').equals('circle'))
      .notEmpty().withMessage('Radius is required for circle geofence')
      .isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),
    
    // Polygon-specific fields
    body('points')
      .if(body('type').equals('polygon'))
      .notEmpty().withMessage('Points are required for polygon geofence')
      .isArray({ min: 3 }).withMessage('Polygon must have at least 3 points'),
    
    body('points.*.lat')
      .if(body('type').equals('polygon'))
      .notEmpty().withMessage('Each point must have a latitude')
      .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    
    body('points.*.lng')
      .if(body('type').equals('polygon'))
      .notEmpty().withMessage('Each point must have a longitude')
      .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    
    // Common fields
    body('alertOnEntry')
      .optional()
      .isBoolean().withMessage('alertOnEntry must be a boolean')
      .toBoolean()
      .default(true),
    
    body('alertOnExit')
      .optional()
      .isBoolean().withMessage('alertOnExit must be a boolean')
      .toBoolean()
      .default(true),
    
    body('alertOnDwell')
      .optional()
      .isBoolean().withMessage('alertOnDwell must be a boolean')
      .toBoolean()
      .default(false),
    
    body('dwellTime')
      .optional()
      .isInt({ min: 1, max: 60 }).withMessage('Dwell time must be between 1 and 60 minutes')
      .toInt()
      .default(5),
    
    body('enabled')
      .optional()
      .isBoolean().withMessage('enabled must be a boolean')
      .toBoolean()
      .default(true),
  ]),
  locationController.createGeofence
);

// Get all geofences
router.get('/geofence',
  authenticate,
  authorize('admin', 'hospital'),
  validate([
    query('enabled')
      .optional()
      .isBoolean().withMessage('enabled must be a boolean')
      .toBoolean(),
    query('type')
      .optional()
      .isIn(['circle', 'polygon', 'rectangle']).withMessage('Invalid geofence type'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),
  ]),
  locationController.getGeofences
);

// Get geofence by ID
router.get('/geofence/:geofenceId',
  authenticate,
  authorize('admin', 'hospital'),
  validate(geofenceIdParamValidation),
  locationController.getGeofenceById
);

// Update geofence
router.put('/geofence/:geofenceId',
  authenticate,
  authorize('admin'),
  validate([
    ...geofenceIdParamValidation,
    body('name')
      .optional()
      .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters')
      .trim(),
    body('type')
      .optional()
      .isIn(['circle', 'polygon', 'rectangle']).withMessage('Invalid geofence type'),
    body('center.lat')
      .optional()
      .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('center.lng')
      .optional()
      .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    body('radius')
      .optional()
      .isFloat({ min: 0.1, max: 100 }).withMessage('Radius must be between 0.1 and 100 km'),
    body('points')
      .optional()
      .isArray().withMessage('Points must be an array'),
    body('alertOnEntry')
      .optional()
      .isBoolean().withMessage('alertOnEntry must be a boolean')
      .toBoolean(),
    body('alertOnExit')
      .optional()
      .isBoolean().withMessage('alertOnExit must be a boolean')
      .toBoolean(),
    body('alertOnDwell')
      .optional()
      .isBoolean().withMessage('alertOnDwell must be a boolean')
      .toBoolean(),
    body('dwellTime')
      .optional()
      .isInt({ min: 1, max: 60 }).withMessage('Dwell time must be between 1 and 60 minutes')
      .toInt(),
    body('enabled')
      .optional()
      .isBoolean().withMessage('enabled must be a boolean')
      .toBoolean(),
  ]),
  locationController.updateGeofence
);

// Delete geofence
router.delete('/geofence/:geofenceId',
  authenticate,
  authorize('admin'),
  validate(geofenceIdParamValidation),
  locationController.deleteGeofence
);

// ==================== GEOFENCE VIOLATIONS ====================

// Check geofence violations for a driver
router.get('/geofence/check/:driverId',
  authenticate,
  authorize('admin', 'hospital'),
  validate([
    ...driverIdParamValidation,
    query('geofenceId')
      .optional()
      .isMongoId().withMessage('Invalid geofence ID format'),
  ]),
  locationController.checkGeofenceViolations
);

// Get geofence violations history
router.get('/geofence/violations',
  authenticate,
  authorize('admin', 'hospital'),
  validate([
    query('driverId')
      .optional()
      .isMongoId().withMessage('Invalid driver ID'),
    query('geofenceId')
      .optional()
      .isMongoId().withMessage('Invalid geofence ID'),
    query('startDate')
      .optional()
      .isISO8601().withMessage('Invalid start date')
      .toDate(),
    query('endDate')
      .optional()
      .isISO8601().withMessage('Invalid end date')
      .toDate(),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('resolved')
      .optional()
      .isBoolean().withMessage('resolved must be a boolean')
      .toBoolean(),
  ]),
  locationController.getGeofenceViolations
);

// ==================== BATCH OPERATIONS ====================

// Batch location update (admin only)
router.post('/batch',
  authenticate,
  authorize('admin'),
  validate([
    body('locations')
      .isArray({ min: 1, max: 100 }).withMessage('Locations must be an array of 1-100 items'),
    body('locations.*.driverId')
      .isMongoId().withMessage('Invalid driver ID'),
    body('locations.*.latitude')
      .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('locations.*.longitude')
      .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('locations.*.timestamp')
      .optional()
      .isISO8601().withMessage('Invalid timestamp'),
  ]),
  locationController.batchUpdateLocations
);

export default router;