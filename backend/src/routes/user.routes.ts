import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as userController from '../controllers/user.controller';
import * as driverController from '../controllers/driver.controller';
import { authenticate, authorize, requireAdmin, requireDriver } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// ==================== VALIDATION RULES ====================

const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .trim(),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-]{10,}$/).withMessage('Please provide a valid phone number')
    .trim(),
  body('profileImage')
    .optional()
    .isURL().withMessage('Profile image must be a valid URL'),
  body('address')
    .optional()
    .isString().withMessage('Address must be a string'),
  body('location.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

const emergencyContactValidation = [
  body('name')
    .notEmpty().withMessage('Contact name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .trim(),
  body('relationship')
    .notEmpty().withMessage('Relationship is required')
    .trim(),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[\d\s-]{10,}$/).withMessage('Please provide a valid phone number')
    .trim(),
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('isPrimary')
    .optional()
    .isBoolean().withMessage('isPrimary must be a boolean')
    .toBoolean(),
];

const medicalInfoValidation = [
  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),
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
  body('organDonor')
    .optional()
    .isBoolean().withMessage('organDonor must be a boolean')
    .toBoolean(),
  body('doctorName')
    .optional()
    .isString().withMessage('Doctor name must be a string')
    .trim(),
  body('doctorPhone')
    .optional()
    .matches(/^\+?[\d\s-]{7,}$/).withMessage('Invalid doctor phone number')
    .trim(),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const userIdParamValidation = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID format'),
];

const contactIdParamValidation = [
  param('contactId')
    .isMongoId().withMessage('Invalid contact ID format'),
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('search')
    .optional()
    .isString().withMessage('Search must be a string')
    .trim(),
  query('status')
    .optional()
    .isIn(['online', 'offline', 'all']).withMessage('Status must be online, offline, or all'),
  query('hospitalId')
    .optional()
    .isMongoId().withMessage('Invalid hospital ID format'),
];

// ==================== PROTECTED ROUTES ====================

// Profile
router.get('/profile/:userId?',
  authenticate,
  validate(userIdParamValidation),
  userController.getUserProfile,
);

router.put('/profile',
  authenticate,
  validate(updateProfileValidation),
  userController.updateUserProfile,
);

// Password
router.put('/change-password',
  authenticate,
  validate(changePasswordValidation),
  userController.changePassword,
);

// Emergency contacts
router.get('/emergency-contacts',
  authenticate,
  userController.getEmergencyContacts,
);

router.post('/emergency-contacts',
  authenticate,
  validate(emergencyContactValidation),
  userController.addEmergencyContact,
);

router.put('/emergency-contacts/:contactId',
  authenticate,
  validate([...contactIdParamValidation, ...emergencyContactValidation]),
  userController.updateEmergencyContact,
);

router.delete('/emergency-contacts/:contactId',
  authenticate,
  validate(contactIdParamValidation),
  userController.deleteEmergencyContact,
);

// Medical info
router.put('/medical-info',
  authenticate,
  validate(medicalInfoValidation),
  userController.updateMedicalInfo,
);

// ==================== DRIVER ROUTES ====================

// Trip scores
router.post('/trip-scores',
  authenticate,
  requireDriver,
  driverController.submitTripScore,
);

router.get('/trip-scores/average',
  authenticate,
  requireDriver,
  driverController.getAverageTripScore,
);

router.get('/trip-scores',
  authenticate,
  requireDriver,
  driverController.getTripScores,
);

// Preferences
router.get('/preferences',
  authenticate,
  driverController.getPreferences,
);

router.put('/preferences',
  authenticate,
  driverController.savePreferences,
);

// ==================== ADMIN/HOSPITAL ROUTES ====================

router.get('/drivers',
  authenticate,
  authorize('admin', 'hospital'),
  validate(paginationValidation),
  userController.getAllDrivers,
);

router.get('/hospitals',
  authenticate,
  authorize('admin'),
  validate(paginationValidation),
  userController.getAllHospitals,
);

router.get('/responders',
  authenticate,
  authorize('admin', 'hospital'),
  validate(paginationValidation),
  userController.getAllResponders,
);

// ==================== ADMIN ONLY ROUTES ====================

router.put('/:userId/status',
  authenticate,
  requireAdmin,
  validate([
    ...userIdParamValidation,
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ]),
  userController.updateUserStatus,
);

router.delete('/:userId',
  authenticate,
  requireAdmin,
  validate(userIdParamValidation),
  userController.deleteUser,
);

export default router;
