import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as incidentController from '../controllers/incident.controller';
import { authenticate, authorize, requireDriver, requireHospital } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
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

const incidentIdParamValidation = [
  param('incidentId').isMongoId().withMessage('Invalid incident ID format'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Routes
router.post('/',
  authenticate,
  requireDriver,
  emergencyLimiter,
  validate(createIncidentValidation),
  incidentController.createIncident
);

router.get('/active',
  authenticate,
  authorize('hospital', 'admin'),
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
  validate(incidentIdParamValidation),
  incidentController.updateIncidentStatus
);

router.post('/:incidentId/accept',
  authenticate,
  requireHospital,
  validate(incidentIdParamValidation),
  incidentController.acceptIncident
);

router.get('/user/:userId',
  authenticate,
  validate(paginationValidation),
  incidentController.getUserIncidents
);

router.post('/:incidentId/responder/:responderId/location',
  authenticate,
  authorize('responder'),
  incidentController.updateResponderLocation
);

router.post('/:incidentId/responder/:responderId/arrived',
  authenticate,
  authorize('responder'),
  incidentController.markResponderArrived
);

router.post('/:incidentId/resolve',
  authenticate,
  authorize('responder', 'hospital', 'admin'),
  incidentController.resolveIncident
);

router.post('/:incidentId/cancel',
  authenticate,
  authorize('driver', 'hospital', 'admin'),
  incidentController.cancelIncident
);

router.get('/:incidentId/report',
  authenticate,
  authorize('hospital', 'admin'),
  validate(incidentIdParamValidation),
  incidentController.generateIncidentReport
);

export default router;