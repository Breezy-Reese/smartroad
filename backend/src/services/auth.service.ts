import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { appConfig } from '../config/app.config';
import { IAuthTokens, ILoginRequest, IRegisterRequest, IUserDocument } from '../types/user.types';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { redisClient } from '../config/redis.config';

class AuthService {
  private readonly TOKEN_EXPIRY = {
    access: '7d',
    refresh: '30d',
    emailVerification: '24h',
    passwordReset: '1h',
  };

  async register(userData: IRegisterRequest): Promise<{ user: IUserDocument; tokens: IAuthTokens }> {
    try {
      // Check if user exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create user based on role
      const user = new User(userData);
      await user.save();

      // Generate tokens
      const tokens = this.generateTokens(user._id.toString(), user.role);

      // Save refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      // Store in Redis for quick access
      await this.cacheUserData(user);

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.name).catch(err => {
        logger.error('Failed to send welcome email:', err);
      });

      logger.info(`User registered successfully: ${user.email} (${user.role})`);

      return { user, tokens };
    } catch (error) {
      logger.error('Registration service error:', error);
      throw error;
    }
  }

  async login(credentials: ILoginRequest): Promise<{ user: IUserDocument; tokens: IAuthTokens }> {
    try {
      // Find user with password field
      const user = await User.findOne({ email: credentials.email }).select('+password');
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(credentials.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      user.lastLogin = new Date();
      
      // Generate tokens
      const expiresIn = credentials.rememberMe ? '30d' : '7d';
      const tokens = this.generateTokens(user._id.toString(), user.role, expiresIn);

      // Save refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      // Update cache
      await this.cacheUserData(user);

      logger.info(`User logged in successfully: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Login service error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<IAuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, appConfig.jwt.refreshSecret) as any;

      // Find user with refresh token
      const user = await User.findOne({ 
        _id: decoded.userId,
        refreshToken,
      });

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user._id.toString(), user.role);

      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      logger.info(`Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      logger.error('Token refresh service error:', error);
      throw error;
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // Clear refresh token
      await User.findByIdAndUpdate(userId, { refreshToken: null });

      // Remove from Redis cache
      await redisClient.del(`user:${userId}`);
      await redisClient.del(`user:${userId}:profile`);

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout service error:', error);
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isVerified) {
        return true; // Already verified
      }

      user.isVerified = true;
      user.emailVerificationToken = undefined;
      await user.save();

      // Update cache
      await this.cacheUserData(user);

      logger.info(`Email verified for user: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  async generateEmailVerificationToken(userId: string): Promise<string> {
    const token = jwt.sign(
      { userId },
      appConfig.jwt.secret,
      { expiresIn: this.TOKEN_EXPIRY.emailVerification }
    );

    await User.findByIdAndUpdate(userId, { emailVerificationToken: token });

    return token;
  }

  async forgotPassword(email: string): Promise<string> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user._id },
        appConfig.jwt.secret,
        { expiresIn: this.TOKEN_EXPIRY.passwordReset }
      );

      // Store reset token
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      logger.info(`Password reset requested for: ${email}`);

      return resetToken;
    } catch (error) {
      logger.error('Forgot password service error:', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // Verify token
      const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

      // Find user with valid reset token
      const user = await User.findOne({
        _id: decoded.userId,
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      }).select('+password');

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
     user.refreshToken = undefined; // Invalidate all sessions
      await user.save();

      // Clear cache
      await redisClient.del(`user:${user._id}`);
      await redisClient.del(`user:${user._id}:profile`);

      logger.info(`Password reset successful for: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Reset password service error:', error);
      throw error;
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      user.refreshToken = undefined; // Invalidate all sessions
      await user.save();

      // Clear cache
      await redisClient.del(`user:${userId}`);
      await redisClient.del(`user:${userId}:profile`);

      logger.info(`Password changed for user: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Change password service error:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<{ userId: string; role: string }> {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as any;
      return {
        userId: decoded.userId,
        role: decoded.role,
      };
    } catch (error) {
      logger.error('Token validation error:', error);
      throw new Error('Invalid or expired token');
    }
  }

  async getUserFromCache(userId: string): Promise<IUserDocument | null> {
    try {
      const cached = await redisClient.get(`user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('Error getting user from cache:', error);
      return null;
    }
  }

  async cacheUserData(user: IUserDocument): Promise<void> {
    try {
      const userData = user.toJSON();
      await redisClient.setEx(`user:${user._id}`, 3600, JSON.stringify(userData)); // 1 hour cache
      await redisClient.setEx(`user:${user._id}:profile`, 300, JSON.stringify(userData)); // 5 min cache for profile
    } catch (error) {
      logger.error('Error caching user data:', error);
    }
  }

  async getProfile(userId: string): Promise<IUserDocument | null> {
    try {
      // Try cache first
      const cached = await redisClient.get(`user:${userId}:profile`);
      if (cached) {
        return JSON.parse(cached);
      }

      // If not in cache, get from database
      const user = await User.findById(userId)
        .select('-refreshToken -password')
        .populate('vehicleId', 'plateNumber model make');

      if (user) {
        await this.cacheUserData(user);
      }

      return user;
    } catch (error) {
      logger.error('Error getting profile:', error);
      throw error;
    }
  }

  async updateProfile(userId: string, updates: Partial<IUserDocument>): Promise<IUserDocument> {
    try {
      // Remove sensitive fields
      delete updates.password;
      delete updates.refreshToken;
      delete updates.role;

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-refreshToken');

      if (!user) {
        throw new Error('User not found');
      }

      // Update cache
      await this.cacheUserData(user);

      logger.info(`Profile updated for user: ${user.email}`);

      return user;
    } catch (error) {
      logger.error('Profile update service error:', error);
      throw error;
    }
  }

  async deactivateAccount(userId: string): Promise<boolean> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          isActive: false,
          refreshToken: null,
        },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Clear cache
      await redisClient.del(`user:${userId}`);
      await redisClient.del(`user:${userId}:profile`);

      logger.info(`Account deactivated: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Account deactivation error:', error);
      throw error;
    }
  }

  private generateTokens(
    userId: string,
    role: string,
    _expiresIn: string = this.TOKEN_EXPIRY.access
  ): IAuthTokens {
   const payload = {
  userId,
  role,
};


    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET!, {
  expiresIn: appConfig.jwt.expiresIn,
})

    return { accessToken, refreshToken };
  }

  async verifyMFA(_userId: string, _code: string): Promise<boolean> {
    // Implement MFA verification if needed
    // This is a placeholder for future implementation
    return true;
  }

  async generateMFACode(_userId: string): Promise<string> {
    // Implement MFA code generation if needed
    // This is a placeholder for future implementation
    return '123456';
  }
}

export const authService = new AuthService();