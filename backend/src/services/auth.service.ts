import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { appConfig } from '../config/app.config';
import {
  IAuthTokens,
  ILoginRequest,
  IRegisterRequest,
  IUserDocument,
} from '../types/user.types';
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

  // ================= REGISTER =================

  async register(
    userData: IRegisterRequest
  ): Promise<{ user: IUserDocument; tokens: IAuthTokens }> {
    try {
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const user = new User(userData);
      await user.save();

      const tokens = this.generateTokens(user._id.toString(), user.role);

      user.refreshToken = tokens.refreshToken;
      await user.save();

      await this.cacheUserData(user);

      await emailService
        .sendWelcomeEmail(user.email, user.name)
        .catch((err) => logger.error('Welcome email failed:', err));

      logger.info(`User registered: ${user.email} (${user.role})`);

      return { user, tokens };
    } catch (error) {
      logger.error('Registration service error:', error);
      throw error;
    }
  }

  // ================= LOGIN =================

  async login(
    credentials: ILoginRequest
  ): Promise<{ user: IUserDocument; tokens: IAuthTokens }> {
    try {
      const user = await User.findOne({ email: credentials.email }).select(
        '+password'
      );

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      const isPasswordValid = await user.comparePassword(credentials.password);

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      user.lastLogin = new Date();

      const expiresIn = credentials.rememberMe ? '30d' : '7d';

      const tokens = this.generateTokens(user._id.toString(), user.role, expiresIn);

      user.refreshToken = tokens.refreshToken;
      await user.save();

      await this.cacheUserData(user);

      logger.info(`User logged in: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Login service error:', error);
      throw error;
    }
  }

  // ================= REFRESH TOKEN =================

  async refreshToken(refreshToken: string): Promise<IAuthTokens> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        appConfig.jwt.refreshSecret
      ) as { userId: string; role: string };

      const user = await User.findOne({
        _id: decoded.userId,
        refreshToken,
      });

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      const tokens = this.generateTokens(user._id.toString(), user.role);

      user.refreshToken = tokens.refreshToken;
      await user.save();

      logger.info(`Token refreshed for: ${user.email}`);

      return tokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  // ================= LOGOUT =================

  async logout(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, { refreshToken: null });

      await redisClient.del(`user:${userId}`);
      await redisClient.del(`user:${userId}:profile`);

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  // ================= EMAIL VERIFICATION =================

  async verifyEmail(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as {
        userId: string;
      };

      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isVerified) return true;

      user.isVerified = true;
      user.emailVerificationToken = undefined;

      await user.save();
      await this.cacheUserData(user);

      logger.info(`Email verified: ${user.email}`);

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

    await User.findByIdAndUpdate(userId, {
      emailVerificationToken: token,
    });

    return token;
  }

  // ================= PASSWORD RESET =================

  async forgotPassword(email: string): Promise<string> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error('User not found');
      }

      const resetToken = jwt.sign(
        { userId: user._id },
        appConfig.jwt.secret,
        { expiresIn: this.TOKEN_EXPIRY.passwordReset }
      );

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 3600000);

      await user.save();

      logger.info(`Password reset requested: ${email}`);

      return resetToken;
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as {
        userId: string;
      };

      const user = await User.findOne({
        _id: decoded.userId,
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      }).select('+password');

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.refreshToken = undefined;

      await user.save();

      await redisClient.del(`user:${user._id}`);
      await redisClient.del(`user:${user._id}:profile`);

      logger.info(`Password reset successful: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }

  // ================= PASSWORD CHANGE =================

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

      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      user.password = newPassword;
      user.refreshToken = undefined;

      await user.save();

      await redisClient.del(`user:${userId}`);
      await redisClient.del(`user:${userId}:profile`);

      logger.info(`Password changed: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  // ================= TOKEN VALIDATION =================

  async validateToken(token: string): Promise<{ userId: string; role: string }> {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret) as {
        userId: string;
        role: string;
      };

      return {
        userId: decoded.userId,
        role: decoded.role,
      };
    } catch (error) {
      logger.error('Token validation error:', error);
      throw new Error('Invalid or expired token');
    }
  }

  // ================= CACHE =================

  async getUserFromCache(userId: string): Promise<IUserDocument | null> {
    try {
      const cached = await redisClient.get(`user:${userId}`);

      if (!cached) return null;

      return JSON.parse(cached) as IUserDocument;
    } catch (error) {
      logger.error('Cache read error:', error);
      return null;
    }
  }

  async cacheUserData(user: IUserDocument): Promise<void> {
    try {
      const data = JSON.stringify(user.toJSON());

      await redisClient.setEx(`user:${user._id}`, 3600, data);
      await redisClient.setEx(`user:${user._id}:profile`, 300, data);
    } catch (error) {
      logger.error('Cache write error:', error);
    }
  }

  // ================= PROFILE =================

  async getProfile(userId: string): Promise<IUserDocument | null> {
    try {
      const cached = await redisClient.get(`user:${userId}:profile`);

      if (cached) {
        return JSON.parse(cached);
      }

      const user = await User.findById(userId)
        .select('-refreshToken -password')
        .populate('vehicleId', 'plateNumber model make');

      if (user) {
        await this.cacheUserData(user);
      }

      return user;
    } catch (error) {
      logger.error('Profile fetch error:', error);
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    updates: Partial<IUserDocument>
  ): Promise<IUserDocument> {
    try {
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

      await this.cacheUserData(user);

      logger.info(`Profile updated: ${user.email}`);

      return user;
    } catch (error) {
      logger.error('Profile update error:', error);
      throw error;
    }
  }

  // ================= ACCOUNT =================

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

      await redisClient.del(`user:${userId}`);
      await redisClient.del(`user:${userId}:profile`);

      logger.info(`Account deactivated: ${user.email}`);

      return true;
    } catch (error) {
      logger.error('Account deactivation error:', error);
      throw error;
    }
  }

  // ================= TOKEN GENERATION =================

  private generateTokens(
    userId: string,
    role: string,
    expiresIn: string = this.TOKEN_EXPIRY.access
  ): IAuthTokens {
    const payload = { userId, role };

    const accessToken = jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn,
    });

    const refreshToken = jwt.sign(payload, appConfig.jwt.refreshSecret, {
      expiresIn: this.TOKEN_EXPIRY.refresh,
    });

    return { accessToken, refreshToken };
  }

  // ================= MFA (Placeholder) =================

  async verifyMFA(_userId: string, _code: string): Promise<boolean> {
    return true;
  }

  async generateMFACode(_userId: string): Promise<string> {
    return '123456';
  }
}

export const authService = new AuthService();