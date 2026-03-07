import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { logger } from '../utils/logger';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
    }));

    logger.warn('Validation failed:', formattedErrors);

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
    });
  };
};

export const validateLocation = (req: Request, res: Response, next: NextFunction) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude are required',
    });
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Latitude and longitude must be numbers',
    });
  }

  if (lat < -90 || lat > 90) {
    return res.status(400).json({
      success: false,
      error: 'Latitude must be between -90 and 90',
    });
  }

  if (lng < -180 || lng > 180) {
    return res.status(400).json({
      success: false,
      error: 'Longitude must be between -180 and 180',
    });
  }

  next();
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  // Remove any potentially dangerous characters
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim().replace(/[<>]/g, '');
      }
    });
  }
  next();
};