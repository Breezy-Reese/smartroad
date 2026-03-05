import { body, ValidationChain } from 'express-validator';

export const validateEmail = (field: string = 'email'): ValidationChain => {
  return body(field)
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .toLowerCase();
};

export const validatePassword = (field: string = 'password'): ValidationChain => {
  return body(field)
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character');
};

export const validateName = (field: string = 'name'): ValidationChain => {
  return body(field)
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .trim()
    .escape();
};

export const validatePhone = (field: string = 'phone'): ValidationChain => {
  return body(field)
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[\d\s-]{10,}$/).withMessage('Please provide a valid phone number')
    .trim();
};

export const validateRole = (field: string = 'role'): ValidationChain => {
  return body(field)
    .notEmpty().withMessage('Role is required')
    .isIn(['driver', 'hospital', 'responder', 'admin']).withMessage('Invalid role');
};

export const validateToken = (field: string = 'token'): ValidationChain => {
  return body(field)
    .notEmpty().withMessage('Token is required')
    .isString().withMessage('Token must be a string');
};

export const validateRefreshToken = (): ValidationChain => {
  return body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
    .isString().withMessage('Refresh token must be a string');
};

export const validateRememberMe = (): ValidationChain => {
  return body('rememberMe')
    .optional()
    .isBoolean().withMessage('Remember me must be a boolean');
};

export const validatePasswordMatch = (): ValidationChain => {
  return body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match');
};