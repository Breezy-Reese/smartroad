import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as incidentController from '../controllers/incident.controller';
import { authenticate, authorize, requireDriver, requireHospital } from '../middleware/auth.middleware';
import { validate, validateLocation } from '../middleware/validation.middleware';
import { emergencyLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Validation rules
const createIncidentValidation = [
  body('type')
    .notEmpty().withMessage('Incident type is required')
    .isIn(['collision', 'rollover', 'fire', 'medical', 'other']).withMessage('Invalid incident type'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical', 'fatal']).withMessage('Invalid severity level'),
  body('speed')
    .optional()
    .isFloat({ min: 0 }).withMessage('Speed must be a positive number'),
  body('impactForce')
    .optional()
    .isFloat({ min: 0 }).withMessage('Impact force must be a positive number'),
  body('airbagDeployed')
    .optional()
    .isBoolean().withMessage('airbagDeployed must be a boolean'),
  body('occupants')
    .optional()
    .isInt({ min: 1 }).withMessage('Occupants must be at least 1'),
  body('vehicleNumber')
    .optional()
    .isString().withMessage('Vehicle number must be a string'),
  body('location')
    .notEmpty().withMessage('Location is required'),
];

const updateIncidentValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'detected', 'confirmed', 'dispatched', 'en-route', 'arrived', 'treating', 'transporting', 'resolved', 'cancelled'])
    .withMessage('Invalid status'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical', 'fatal']).withMessage('Invalid severity'),
  body('injuries')
    .optional()
    .isInt({ min: 0 }).withMessage('Injuries must be a non-negative integer'),
  body('fatalities')
    .optional()
    .isInt({ min: 0 }).withMessage('Fatalities must be a non-negative integer'),
];

const acceptIncidentValidation = [
  body('hospitalId')
    .notEmpty().withMessage('Hospital ID is required')
    .isMongoId().withMessage('Invalid hospital ID'),
  body('responderId')
    .notEmpty().withMessage('Responder ID is required')
    .isMongoId().withMessage('Invalid responder ID'),
  body('responderName')
    .notEmpty().withMessage('Responder name is required'),
  body('eta')
    .notEmpty().withMessage('ETA is required')
    .isInt({ min: 1 }).withMessage('ETA must be at least 1 minute'),
  body('distance')
    .notEmpty().withMessage('Distance is required')
    .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
];

const incidentIdParamValidation = [
  param('incidentId')
    .isMongoId().withMessage('Invalid incident ID format'),
];

const userIdParamValidation = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID format'),
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isString().withMessage('Status must be a string'),
  query('severity')
    .optional()
    .isString().withMessage('Severity must be a string'),
];

const locationQueryValidation = [
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isFloat({ min: 0, max: 50 }).withMessage('Radius must be between 0 and 50 km'),
];

// Incident routes
router.post('/',
  authenticate,
  requireDriver,
  emergencyLimiter,
  validateLocation,
  validate(createIncidentValidation),
  incidentController.createIncident
);

router.get('/active',
  authenticate,
  authorize('hospital', 'admin'),
  validate([...locationQueryValidation, ...paginationValidation]),
  incidentController.getActiveIncidents
);

router.get('/stats',
  authenticate,
  authorize('admin', 'hospital'),
  incidentController.getIncidentStats
);

router.get('/:incidentId',
  authenticate,
  validate(incidentIdParamValidation),
  incidentController.getIncident
);

router.put('/:incidentId',
  authenticate,
  authorize('hospital', 'admin'),
  validate([...incidentIdParamValidation, ...updateIncidentValidation]),
  incidentController.updateIncidentStatus
);

router.post('/:incidentId/accept',
  authenticate,
  requireHospital,
  validate([...incidentIdParamValidation, ...acceptIncidentValidation]),
  incidentController.acceptIncident
);

router.get('/user/:userId',
  authenticate,
  validate([...userIdParamValidation, ...paginationValidation]),
  incidentController.getUserIncidents
);

// Responder updates
router.post('/:incidentId/responder/:responderId/location',
  authenticate,
  authorize('responder'),
  validate([
    ...incidentIdParamValidation,
    param('responderId').isMongoId().withMessage('Invalid responder ID'),
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  ]),
  incidentController.updateResponderLocation
);

router.post('/:incidentId/responder/:responderId/arrived',
  authenticate,
  authorize('responder'),
  validate([...incidentIdParamValidation, param('responderId').isMongoId()]),
  incidentController.markResponderArrived
);

// Resolution
router.post('/:incidentId/resolve',
  authenticate,
  authorize('responder', 'hospital', 'admin'),
  validate([...incidentIdParamValidation, body('notes').optional().isString()]),
  incidentController.resolveIncident
);

router.post('/:incidentId/cancel',
  authenticate,
  authorize('driver', 'hospital', 'admin'),
  validate([...incidentIdParamValidation, body('reason').notEmpty().isString()]),
  incidentController.cancelIncident
);

// Reports
router.get('/:incidentId/report',
  authenticate,
  authorize('hospital', 'admin'),
  validate(incidentIdParamValidation),
  incidentController.generateIncidentReport
);

export default router;