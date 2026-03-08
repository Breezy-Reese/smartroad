import { NextFunction, Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate, refreshTokenAuth, logout, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

/* ============================================================
   VALIDATION RULES
============================================================ */

// Registration validation
const registerValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['driver', 'hospital', 'responder']).withMessage('Invalid role'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[\d\s-]{10,}$/).withMessage('Please provide a valid phone number'),
  body('licenseNumber')
    .if(body('role').equals('driver'))
    .notEmpty().withMessage('License number is required for drivers'),
  body('hospitalName')
    .if(body('role').equals('hospital'))
    .notEmpty().withMessage('Hospital name is required'),
];

// Login validation
const loginValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean().withMessage('Remember me must be a boolean'),
];

// Forgot password
const forgotPasswordValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
];

// Reset password
const resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Token is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

// Change password
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

/* ============================================================
   PUBLIC ROUTES
============================================================ */
router.post('/register', authLimiter, validate(registerValidation), authController.register);
router.post('/login', authLimiter, validate(loginValidation), authController.login);
router.post('/refresh-token', authLimiter, refreshTokenAuth, authController.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordValidation), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordValidation), authController.resetPassword);
router.get('/verify-email/:token', authLimiter, authController.verifyEmail);

/* ============================================================
   PROTECTED ROUTES
============================================================ */
router.post('/logout', authenticate, logout, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, validate(changePasswordValidation), authController.changePassword);
router.post('/resend-verification', authenticate, authController.resendVerificationEmail);

export default router;