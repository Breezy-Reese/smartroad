import { body, param, query, ValidationChain } from 'express-validator';

/* =========================
   INCIDENT VALIDATORS
========================= */

/** Validate MongoDB incident ID from route params */
export const validateIncidentId = (field: string = 'incidentId'): ValidationChain =>
  param(field).isMongoId().withMessage('Invalid incident ID format');

/** Validate incident type */
export const validateIncidentType = (field: string = 'type'): ValidationChain =>
  body(field)
    .notEmpty().withMessage('Incident type is required')
    .isIn(['collision', 'rollover', 'fire', 'medical', 'other'])
    .withMessage('Invalid incident type');

/** Validate severity */
export const validateSeverity = (field: string = 'severity'): ValidationChain =>
  body(field)
    .optional()
    .isIn(['low', 'medium', 'high', 'critical', 'fatal'])
    .withMessage('Invalid severity level');

/** Validate incident status */
export const validateIncidentStatus = (field: string = 'status'): ValidationChain =>
  body(field)
    .optional()
    .isIn([
      'pending', 'detected', 'confirmed', 'dispatched', 'en-route',
      'arrived', 'treating', 'transporting', 'resolved', 'cancelled', 'false-alarm'
    ])
    .withMessage('Invalid status');

/** Validate location object with latitude and longitude */
export const validateLocation = (): ValidationChain[] => [
  body('location.lat')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('location.lng')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
];

/** Validate vehicle speed */
export const validateSpeed = (field: string = 'speed'): ValidationChain =>
  body(field)
    .optional()
    .isFloat({ min: 0 }).withMessage('Speed must be a positive number');

/** Validate impact force */
export const validateImpactForce = (field: string = 'impactForce'): ValidationChain =>
  body(field)
    .optional()
    .isFloat({ min: 0 }).withMessage('Impact force must be a positive number');

/** Validate if airbag deployed */
export const validateAirbagDeployed = (field: string = 'airbagDeployed'): ValidationChain =>
  body(field)
    .optional()
    .isBoolean().withMessage('airbagDeployed must be a boolean');

/** Validate number of occupants */
export const validateOccupants = (field: string = 'occupants'): ValidationChain =>
  body(field)
    .optional()
    .isInt({ min: 1 }).withMessage('Occupants must be at least 1');

/** Validate vehicle number */
export const validateVehicleNumber = (field: string = 'vehicleNumber'): ValidationChain =>
  body(field)
    .optional()
    .isString().withMessage('Vehicle number must be a string')
    .trim()
    .toUpperCase();

/** Validate injuries count */
export const validateInjuries = (field: string = 'injuries'): ValidationChain =>
  body(field)
    .optional()
    .isInt({ min: 0 }).withMessage('Injuries must be a non-negative integer');

/** Validate fatalities count */
export const validateFatalities = (field: string = 'fatalities'): ValidationChain =>
  body(field)
    .optional()
    .isInt({ min: 0 }).withMessage('Fatalities must be a non-negative integer');

/** Validate responder information */
export const validateResponderInfo = (): ValidationChain[] => [
  body('responderId')
    .notEmpty().withMessage('Responder ID is required')
    .isMongoId().withMessage('Invalid responder ID'),
  body('responderName')
    .notEmpty().withMessage('Responder name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Responder name must be 2-50 characters'),
  body('eta')
    .notEmpty().withMessage('ETA is required')
    .isInt({ min: 1 }).withMessage('ETA must be at least 1 minute'),
  body('distance')
    .notEmpty().withMessage('Distance is required')
    .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
];

/** Validate pagination query params */
export const validatePagination = (): ValidationChain[] => [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/** Validate date range query params */
export const validateDateRange = (): ValidationChain[] => [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format')
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .toDate()
    .custom((endDate, { req }) => {
      // Check if req and req.query exist
      if (!req || !req.query) {
        return true;
      }
      
      const startDateParam = req.query.startDate;
      const endDateParam = endDate;
      
      // Only validate if both dates are provided
      if (startDateParam && endDateParam) {
        // Convert startDate to Date object (it's a string from query)
        const startDate = new Date(startDateParam as string);
        
        // endDateParam should already be a Date object from .toDate()
        // but let's safely handle it
        const endDateObj = endDateParam instanceof Date 
          ? endDateParam 
          : new Date(endDateParam as string);
        
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDateObj.getTime())) {
          throw new Error('Invalid date format');
        }
        
        if (endDateObj < startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
];

/** Validate radius query param in km */
export const validateRadius = (field: string = 'radius'): ValidationChain =>
  query(field)
    .optional()
    .isFloat({ min: 0.1, max: 50 }).withMessage('Radius must be between 0.1 and 50 km')
    .toFloat();