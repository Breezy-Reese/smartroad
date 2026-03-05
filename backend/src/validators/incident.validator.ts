import { body, param, query, ValidationChain } from 'express-validator';

export const validateIncidentId = (field: string = 'incidentId'): ValidationChain => {
  return param(field)
    .isMongoId().withMessage('Invalid incident ID format');
};

export const validateIncidentType = (field: string = 'type'): ValidationChain => {
  return body(field)
    .notEmpty().withMessage('Incident type is required')
    .isIn(['collision', 'rollover', 'fire', 'medical', 'other'])
    .withMessage('Invalid incident type');
};

export const validateSeverity = (field: string = 'severity'): ValidationChain => {
  return body(field)
    .optional()
    .isIn(['low', 'medium', 'high', 'critical', 'fatal'])
    .withMessage('Invalid severity level');
};

export const validateIncidentStatus = (field: string = 'status'): ValidationChain => {
  return body(field)
    .optional()
    .isIn([
      'pending', 'detected', 'confirmed', 'dispatched', 'en-route',
      'arrived', 'treating', 'transporting', 'resolved', 'cancelled', 'false-alarm'
    ])
    .withMessage('Invalid status');
};

export const validateLocation = (): ValidationChain[] => {
  return [
    body('location.lat')
      .notEmpty().withMessage('Latitude is required')
      .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('location.lng')
      .notEmpty().withMessage('Longitude is required')
      .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  ];
};

export const validateSpeed = (field: string = 'speed'): ValidationChain => {
  return body(field)
    .optional()
    .isFloat({ min: 0 }).withMessage('Speed must be a positive number');
};

export const validateImpactForce = (field: string = 'impactForce'): ValidationChain => {
  return body(field)
    .optional()
    .isFloat({ min: 0 }).withMessage('Impact force must be a positive number');
};

export const validateAirbagDeployed = (field: string = 'airbagDeployed'): ValidationChain => {
  return body(field)
    .optional()
    .isBoolean().withMessage('airbagDeployed must be a boolean');
};

export const validateOccupants = (field: string = 'occupants'): ValidationChain => {
  return body(field)
    .optional()
    .isInt({ min: 1 }).withMessage('Occupants must be at least 1');
};

export const validateVehicleNumber = (field: string = 'vehicleNumber'): ValidationChain => {
  return body(field)
    .optional()
    .isString().withMessage('Vehicle number must be a string')
    .trim()
    .toUpperCase();
};

export const validateInjuries = (field: string = 'injuries'): ValidationChain => {
  return body(field)
    .optional()
    .isInt({ min: 0 }).withMessage('Injuries must be a non-negative integer');
};

export const validateFatalities = (field: string = 'fatalities'): ValidationChain => {
  return body(field)
    .optional()
    .isInt({ min: 0 }).withMessage('Fatalities must be a non-negative integer');
};

export const validateResponderInfo = (): ValidationChain[] => {
  return [
    body('responderId')
      .notEmpty().withMessage('Responder ID is required')
      .isMongoId().withMessage('Invalid responder ID'),
    body('responderName')
      .notEmpty().withMessage('Responder name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Invalid responder name'),
    body('eta')
      .notEmpty().withMessage('ETA is required')
      .isInt({ min: 1 }).withMessage('ETA must be at least 1 minute'),
    body('distance')
      .notEmpty().withMessage('Distance is required')
      .isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
  ];
};

export const validatePagination = (): ValidationChain[] => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ];
};

export const validateDateRange = (): ValidationChain[] => {
  return [
    query('startDate')
      .optional()
      .isISO8601().withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601().withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
  ];
};

export const validateRadius = (field: string = 'radius'): ValidationChain => {
  return query(field)
    .optional()
    .isFloat({ min: 0.1, max: 50 }).withMessage('Radius must be between 0.1 and 50 km');
};