import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as hospitalController from '../controllers/hospital.controller';
import { authenticate, authorize, requireHospital } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

/* ============================================================
   VALIDATION RULES
============================================================ */

// Update hospital capacity
const capacityUpdateValidation = [
  body('beds').optional().isInt({ min: 0 }).withMessage('Beds must be a non-negative integer'),
  body('ambulances').optional().isInt({ min: 0 }).withMessage('Ambulances must be a non-negative integer'),
  body('responders').optional().isInt({ min: 0 }).withMessage('Responders must be a non-negative integer'),
];

// Dispatch responder
const dispatchValidation = [
  body('incidentId').notEmpty().withMessage('Incident ID is required').isMongoId().withMessage('Invalid incident ID'),
  body('responderId').notEmpty().withMessage('Responder ID is required').isMongoId().withMessage('Invalid responder ID'),
];

// Update hospital location
const locationUpdateValidation = [
  body('lat').notEmpty().withMessage('Latitude is required').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lng').notEmpty().withMessage('Longitude is required').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

// Pagination & query filters
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isString().withMessage('Status must be a string'),
];

// Hospital ID parameter
const hospitalIdParamValidation = [
  param('hospitalId').isMongoId().withMessage('Invalid hospital ID format'),
];

/* ============================================================
   HOSPITAL DASHBOARD & MANAGEMENT
============================================================ */

// Hospital dashboard
router.get(
  '/dashboard',
  authenticate,
  requireHospital,
  hospitalController.getHospitalDashboard
);

// Update hospital capacity
router.put(
  '/capacity',
  authenticate,
  requireHospital,
  validate(capacityUpdateValidation),
  hospitalController.updateHospitalCapacity
);

// Hospital incidents
router.get(
  '/incidents',
  authenticate,
  requireHospital,
  validate(paginationValidation),
  hospitalController.getHospitalIncidents
);

// Available responders
router.get(
  '/responders',
  authenticate,
  requireHospital,
  hospitalController.getAvailableResponders
);

// Dispatch responder to incident
router.post(
  '/dispatch',
  authenticate,
  requireHospital,
  validate(dispatchValidation),
  hospitalController.dispatchResponder
);

/* ============================================================
   ANALYTICS & STATISTICS
============================================================ */

// Analytics for hospital (hospital user)
router.get(
  '/analytics',
  authenticate,
  requireHospital,
  query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid period'),
  hospitalController.getHospitalAnalytics
);

// Add this route to hospital.routes.ts
// Place it in the ANALYTICS & STATISTICS section, before the /:hospitalId/stats route

router.get(
  '/stats',
  authenticate,
  requireHospital,
  hospitalController.getHospitalStats
);


// Admin-only analytics for any hospital
router.get(
  '/:hospitalId/stats',
  authenticate,
  authorize('admin'),
  validate(hospitalIdParamValidation),
  hospitalController.getHospitalAnalytics
);

/* ============================================================
   LOCATION MANAGEMENT
============================================================ */

router.put(
  '/location',
  authenticate,
  requireHospital,
  validate(locationUpdateValidation),
  hospitalController.updateHospitalLocation
);

/* ============================================================
   PUBLIC ENDPOINTS
============================================================ */

// Nearby hospitals
router.get(
  '/nearby',
  validate([
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('radius').optional().isFloat({ min: 1, max: 50 }).withMessage('Invalid radius'),
  ]),
  hospitalController.getNearbyHospitals
);

export default router;