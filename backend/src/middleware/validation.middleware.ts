import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { logger } from '../utils/logger';

/* ============================================================
   EXPRESS-VALIDATOR WRAPPER
============================================================ */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((error) => {
      // Handle different error formats
      let field = 'unknown';
      if (error.type === 'field') {
        field = error.path || error.location || 'unknown';
      } else if (error.type === 'alternative') {
        field = 'alternative';
      } else if (error.type === 'alternative_grouped') {
        field = 'alternative_grouped';
      }

      return {
        field,
        message: error.msg,
        // These might not exist on all error types
        location: (error as any).location,
        value: (error as any).value,
      };
    });

    logger.warn('Validation failed:', formattedErrors);

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
    });
  };
};
/* ============================================================
   LOCATION VALIDATION
============================================================ */
export const validateLocation = (req: Request, res: Response, next: NextFunction): void => {
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    res.status(400).json({
      success: false,
      error: 'Latitude and longitude are required',
    });
    return;
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({
      success: false,
      error: 'Latitude and longitude must be numbers',
    });
    return;
  }

  if (lat < -90 || lat > 90) {
    res.status(400).json({
      success: false,
      error: 'Latitude must be between -90 and 90',
    });
    return;
  }

  if (lng < -180 || lng > 180) {
    res.status(400).json({
      success: false,
      error: 'Longitude must be between -180 and 180',
    });
    return;
  }

  next();
};

/* ============================================================
   PHONE & EMAIL VALIDATION
============================================================ */
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/* ============================================================
   PASSWORD VALIDATION
============================================================ */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain at least one special character (!@#$%^&*)');

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/* ============================================================
   INPUT SANITIZATION
============================================================ */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      const value = req.body[key];
      if (typeof value === 'string') {
        req.body[key] = value.trim().replace(/[<>]/g, '');
      }
    });
  }
  next();
};