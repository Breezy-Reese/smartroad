import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as locationController from '../controllers/location.controller';
import { authenticate, authorize, requireDriver } from '../middleware/auth.middleware';
import { validate, validateLocation } from '../middleware/validation.middleware';
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
];

const driverIdParamValidation = [
  param('driverId')
    .isMongoId().withMessage('Invalid driver ID format'),
];

const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
];

const nearbyQueryValidation = [
  query('lat')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('lng')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 50 }).withMessage('Radius must be between 0.1 and 50 km'),
];

// Location update (drivers only)
router.post('/update',
  authenticate,
  requireDriver,
  locationLimiter,
  validate(locationUpdateValidation),
  locationController.updateLocation
);

// Get driver's current location
router.get('/driver/:driverId',
  authenticate,
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

// Get nearby drivers
router.get('/nearby/drivers',
  authenticate,
  authorize('hospital', 'admin'),
  validate(nearbyQueryValidation),
  locationController.getNearbyDrivers
);

// Get active drivers
router.get('/active/drivers',
  authenticate,
  authorize('hospital', 'admin'),
  locationController.getActiveDrivers
);

// Geofence management (admin only)
router.post('/geofence',
  authenticate,
  authorize('admin'),
  validate([
    body('name').notEmpty().withMessage('Geofence name is required'),
    body('type').isIn(['circle', 'polygon']).withMessage('Invalid geofence type'),
    body('center').optional(),
    body('radius').optional().isFloat({ min: 0.1 }).withMessage('Invalid radius'),
    body('points').optional().isArray().withMessage('Points must be an array'),
    body('alertOnEntry').isBoolean().withMessage('alertOnEntry must be a boolean'),
    body('alertOnExit').isBoolean().withMessage('alertOnExit must be a boolean'),
  ]),
  locationController.createGeofence
);

// Check geofence violations
router.get('/geofence/check/:driverId',
  authenticate,
  authorize('admin', 'hospital'),
  validate(driverIdParamValidation),
  locationController.checkGeofenceViolations
);

export default router;