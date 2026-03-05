import { body, param, query, ValidationChain } from 'express-validator';

export const validateUserId = (field: string = 'userId'): ValidationChain => {
  return param(field)
    .isMongoId().withMessage('Invalid user ID format');
};

export const validateContactId = (field: string = 'contactId'): ValidationChain => {
  return param(field)
    .isMongoId().withMessage('Invalid contact ID format');
};

export const validateEmergencyContact = (): ValidationChain[] => {
  return [
    body('name')
      .notEmpty().withMessage('Contact name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
      .trim()
      .escape(),
    body('relationship')
      .notEmpty().withMessage('Relationship is required')
      .isLength({ min: 2, max: 30 }).withMessage('Invalid relationship')
      .trim(),
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .matches(/^\+?[\d\s-]{10,}$/).withMessage('Please provide a valid phone number'),
    body('email')
      .optional()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('isPrimary')
      .optional()
      .isBoolean().withMessage('isPrimary must be a boolean'),
  ];
};

export const validateMedicalInfo = (): ValidationChain[] => {
  return [
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group'),
    body('allergies')
      .optional()
      .isArray().withMessage('Allergies must be an array'),
    body('allergies.*')
      .optional()
      .isString().withMessage('Each allergy must be a string'),
    body('medicalConditions')
      .optional()
      .isArray().withMessage('Medical conditions must be an array'),
    body('medicalConditions.*')
      .optional()
      .isString().withMessage('Each medical condition must be a string'),
    body('medications')
      .optional()
      .isArray().withMessage('Medications must be an array'),
    body('medications.*')
      .optional()
      .isString().withMessage('Each medication must be a string'),
    body('emergencyNotes')
      .optional()
      .isString().withMessage('Emergency notes must be a string')
      .isLength({ max: 500 }).withMessage('Emergency notes cannot exceed 500 characters'),
    body('organDonor')
      .optional()
      .isBoolean().withMessage('organDonor must be a boolean'),
  ];
};

export const validateDriverInfo = (): ValidationChain[] => {
  return [
    body('licenseNumber')
      .if(body('role').equals('driver'))
      .notEmpty().withMessage('License number is required for drivers')
      .isString().withMessage('Invalid license number')
      .trim()
      .toUpperCase(),
    body('licenseExpiry')
      .if(body('role').equals('driver'))
      .notEmpty().withMessage('License expiry date is required')
      .isISO8601().withMessage('Invalid date format')
      .custom((value) => {
        if (new Date(value) < new Date()) {
          throw new Error('License has expired');
        }
        return true;
      }),
    body('drivingExperience')
      .optional()
      .isInt({ min: 0 }).withMessage('Driving experience must be a non-negative integer'),
  ];
};

export const validateHospitalInfo = (): ValidationChain[] => {
  return [
    body('hospitalName')
      .if(body('role').equals('hospital'))
      .notEmpty().withMessage('Hospital name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Invalid hospital name'),
    body('registrationNumber')
      .if(body('role').equals('hospital'))
      .notEmpty().withMessage('Registration number is required'),
    body('address')
      .if(body('role').equals('hospital'))
      .notEmpty().withMessage('Address is required'),
    body('capacity.beds')
      .optional()
      .isInt({ min: 0 }).withMessage('Beds must be a non-negative integer'),
    body('capacity.ambulances')
      .optional()
      .isInt({ min: 0 }).withMessage('Ambulances must be a non-negative integer'),
    body('capacity.responders')
      .optional()
      .isInt({ min: 0 }).withMessage('Responders must be a non-negative integer'),
    body('services')
      .optional()
      .isArray().withMessage('Services must be an array'),
  ];
};

export const validateResponderInfo = (): ValidationChain[] => {
  return [
    body('responderType')
      .if(body('role').equals('responder'))
      .notEmpty().withMessage('Responder type is required')
      .isIn(['ambulance', 'paramedic', 'doctor', 'rescue']).withMessage('Invalid responder type'),
    body('hospitalId')
      .if(body('role').equals('responder'))
      .notEmpty().withMessage('Hospital ID is required')
      .isMongoId().withMessage('Invalid hospital ID'),
    body('certifications')
      .optional()
      .isArray().withMessage('Certifications must be an array'),
    body('experience')
      .optional()
      .isInt({ min: 0 }).withMessage('Experience must be a non-negative integer'),
  ];
};

export const validateUserStatus = (): ValidationChain => {
  return body('isActive')
    .notEmpty().withMessage('Status is required')
    .isBoolean().withMessage('isActive must be a boolean');
};

export const validateSearchQuery = (): ValidationChain[] => {
  return [
    query('search')
      .optional()
      .isString().withMessage('Search must be a string')
      .isLength({ min: 2 }).withMessage('Search term must be at least 2 characters'),
    query('status')
      .optional()
      .isIn(['online', 'offline']).withMessage('Status must be either online or offline'),
  ];
};