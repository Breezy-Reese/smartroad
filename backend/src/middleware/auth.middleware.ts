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
      throw new Error();
    }

    // Verify token
    const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new Error();
    }

    // Try to get user from cache
    let user = await redisClient.get(`user:${decoded.userId}`);
    
    if (!user) {
      // If not in cache, get from database
      const dbUser = await User.findById(decoded.userId)
        .select('-password -refreshToken');
      
      if (!dbUser || !dbUser.isActive) {
        throw new Error();
      }

      // Cache user data
      user = JSON.stringify(dbUser);
      await redisClient.setex(`user:${decoded.userId}`, 3600, user);
    }

    req.user = JSON.parse(user);
    req.token = token;
    
    next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    res.status(401).json({
      success: false,
      error: 'Please authenticate',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user._id} with role ${req.user.role} attempted to access restricted resource`);
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, appConfig.jwt.secret) as any;
    
    const user = await User.findById(decoded.userId)
      .select('-password -refreshToken');
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
};

export const requireDriver = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      error: 'Driver access required',
    });
  }

  next();
};

export const requireHospital = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.role !== 'hospital') {
    return res.status(403).json({
      success: false,
      error: 'Hospital access required',
    });
  }

  next();
};

export const requireResponder = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.role !== 'responder') {
    return res.status(403).json({
      success: false,
      error: 'Responder access required',
    });
  }

  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  next();
};

export const checkOwnership = (paramName: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const resourceId = req.params[paramName];

    // Allow if user is admin or owns the resource
    if (req.user.role === 'admin' || req.user._id.toString() === resourceId) {
      return next();
    }

    logger.warn(`Ownership check failed: User ${req.user._id} attempted to access resource ${resourceId}`);
    
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to access this resource',
    });
  };
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.token;
    
    if (token) {
      // Add token to blacklist with expiry matching token's remaining time
      const decoded = jwt.decode(token) as any;
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (expiresIn > 0) {
        await redisClient.setex(`blacklist:${token}`, expiresIn, 'true');
      }
    }

    // Clear user from cache
    if (req.user) {
      await redisClient.del(`user:${req.user._id}`);
    }

    next();
  } catch (error) {
    logger.error('Logout middleware error:', error);
    next();
  }
};

export const refreshTokenAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    const decoded = jwt.verify(refreshToken, appConfig.jwt.refreshSecret) as any;

    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken,
      isActive: true,
    });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn('Refresh token authentication failed:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
    });
  }
};