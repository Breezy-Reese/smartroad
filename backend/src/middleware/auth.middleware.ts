import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { appConfig } from '../config/app.config';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis.config';

export interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, error: 'Please authenticate' });
    }

    // Verify token
    const decoded = jwt.verify(token, appConfig.jwt.secret) as { userId: string };

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ success: false, error: 'Token is blacklisted' });
    }

    // Try to get user from cache
    let userStr = await redisClient.get(`user:${decoded.userId}`);
    
    if (!userStr) {
      const dbUser = await User.findById(decoded.userId).select('-password -refreshToken');
      if (!dbUser || !dbUser.isActive) {
        return res.status(401).json({ success: false, error: 'User not found or inactive' });
      }

      // Cache user data
      userStr = JSON.stringify(dbUser);
      await redisClient.setEx(`user:${decoded.userId}`, 3600, userStr); // fixed key/value
    }

    req.user = JSON.parse(userStr);
    req.token = token;

    return next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    return res.status(401).json({ success: false, error: 'Please authenticate' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user._id} with role ${req.user.role} attempted to access restricted resource`);
      return res.status(403).json({ success: false, error: 'You do not have permission' });
    }

    return next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    const decoded = jwt.verify(token, appConfig.jwt.secret) as { userId: string };
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    if (user && user.isActive) req.user = user;

    return next();
  } catch {
    return next(); // ignore errors
  }
};

// Role-based access
export const requireDriver = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (req.user.role !== 'driver') return res.status(403).json({ success: false, error: 'Driver access required' });
  return next();
};

export const requireHospital = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (req.user.role !== 'hospital') return res.status(403).json({ success: false, error: 'Hospital access required' });
  return next();
};

export const requireResponder = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (req.user.role !== 'responder') return res.status(403).json({ success: false, error: 'Responder access required' });
  return next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
  return next();
};

export const checkOwnership = (paramName: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

    const resourceId = req.params[paramName];
    if (req.user.role === 'admin' || req.user._id.toString() === resourceId) return next();

    logger.warn(`Ownership check failed: User ${req.user._id} attempted to access resource ${resourceId}`);
    return res.status(403).json({ success: false, error: 'You do not have permission' });
  };
};

// Logout middleware
export const logout = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const token = req.token;
    if (token) {
      const decoded = jwt.decode(token) as any;
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) await redisClient.setEx(`blacklist:${token}`, expiresIn, 'true');
    }

    if (req.user) await redisClient.del(`user:${req.user._id}`);

    return next();
  } catch (error) {
    logger.error('Logout middleware error:', error);
    return next();
  }
};

// Refresh token middleware
export const refreshTokenAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, appConfig.jwt.refreshSecret) as { userId: string };

    const user = await User.findOne({ _id: decoded.userId, refreshToken, isActive: true });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid refresh token' });

    req.user = user;
    return next();
  } catch (error) {
    logger.warn('Refresh token authentication failed:', error);
    return res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
};