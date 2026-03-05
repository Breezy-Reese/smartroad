import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as userController from '../controllers/user.controller';
import { authenticate, authorize, checkOwnership, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-]{10,}$/).withMessage('Please provide a valid phone number'),
  body('profileImage')
    .optional()
    .isURL().withMessage('Profile image must be a valid URL'),
];

const emergencyContactValidation = [
  body('name')
    .notEmpty().withMessage('Contact name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('relationship')
    .notEmpty().withMessage('Relationship is required'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[\d\s-]{10,}$/).withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email'),
  body('isPrimary')
    .optional()
    .isBoolean().withMessage('isPrimary must be a boolean'),
];

const medicalInfoValidation = [
  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),
  body('allergies')
    .optional()
    .isArray().withMessage('Allergies must be an array'),
  body('medicalConditions')
    .optional()
    .isArray().withMessage('Medical conditions must be an array'),
  body('medications')
    .optional()
    .isArray().withMessage('Medications must be an array'),
  body('organDonor')
    .optional()
    .isBoolean().withMessage('organDonor must be a boolean'),
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
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .isString().withMessage('Search must be a string'),
  query('status')
    .optional()
    .isIn(['online', 'offline']).withMessage('Status must be either online or offline'),
];

// Profile routes
router.get('/profile/:userId?', 
  authenticate,
  validate(userIdParamValidation),
  userController.getUserProfile
);

router.put('/profile',
  authenticate,
  validate(updateProfileValidation),
  userController.updateUserProfile
);

// Emergency contacts
router.get('/emergency-contacts',
  authenticate,
  userController.getEmergencyContacts
);

router.post('/emergency-contacts',
  authenticate,
  validate(emergencyContactValidation),
  userController.addEmergencyContact
);

router.put('/emergency-contacts/:contactId',
  authenticate,
  validate([...contactIdParamValidation, ...emergencyContactValidation]),
  userController.updateEmergencyContact
);

router.delete('/emergency-contacts/:contactId',
  authenticate,
  validate(contactIdParamValidation),
  userController.deleteEmergencyContact
);

// Medical information
router.put('/medical-info',
  authenticate,
  validate(medicalInfoValidation),
  userController.updateMedicalInfo
);

// Admin only routes
router.get('/drivers',
  authenticate,
  authorize('admin', 'hospital'),
  validate(paginationValidation),
  userController.getAllDrivers
);

router.get('/hospitals',
  authenticate,
  authorize('admin'),
  validate(paginationValidation),
  userController.getAllHospitals
);

router.put('/:userId/status',
  authenticate,
  requireAdmin,
  validate([
    ...userIdParamValidation,
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ]),
  userController.updateUserStatus
);

router.delete('/:userId',
  authenticate,
  requireAdmin,
  validate(userIdParamValidation),
  userController.deleteUser
);

export default router;