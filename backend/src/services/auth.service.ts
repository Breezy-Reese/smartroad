import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { appConfig } from '../config/app.config';
import {
  IAuthTokens,
  ILoginRequest,
  IRegisterRequest,
  IUser,
} from '../types/user.types'; // Changed from IUserDocument to IUser
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
): Promise<{ user: IUser; tokens: IAuthTokens }> {
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

    // FIX: Convert to plain object before caching
    const userObject = (user as any).toObject ? (user as any).toObject() : user;
    await this.cacheUserData(userObject as IUser);

    await emailService
      .sendWelcomeEmail(user.email, user.name)
      .catch((err) => logger.error('Welcome email failed:', err));

    logger.info(`User registered: ${user.email} (${user.role})`);

    // Return the already converted object
    return { user: userObject as IUser, tokens };
  } catch (error) {
    logger.error('Registration service error:', error);
    throw error;
  }
}
 // ================= LOGIN =================

async login(
  credentials: ILoginRequest
): Promise<{ user: IUser; tokens: IAuthTokens }> {
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

    const isPasswordValid = await (user as any).comparePassword(credentials.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    user.lastLogin = new Date();

    const expiresIn = credentials.rememberMe ? '30d' : '7d';

    const tokens = this.generateTokens(user._id.toString(), user.role, expiresIn);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    // FIX: Convert to plain object before caching
    const userObject = (user as any).toObject ? (user as any).toObject() : user;
    await this.cacheUserData(userObject as IUser);

    logger.info(`User logged in: ${user.email}`);

    return { user: userObject as IUser, tokens };
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
    (user as any).emailVerificationToken = undefined;

    await user.save();
    
    // FIX: Convert to plain object before caching
    const userObject = (user as any).toObject ? (user as any).toObject() : user;
    await this.cacheUserData(userObject as IUser);

    logger.info(`Email verified: ${user.email}`);

    return true;
  } catch (error) {
    logger.error('Email verification error:', error);
    throw error;
  }
}

async generateEmailVerificationToken(userId: string): Promise<string> {
  // Create a simple string token if you don't need JWT
  const token = Buffer.from(`${userId}-${Date.now()}`).toString('base64');

  await User.findByIdAndUpdate(userId, {
    emailVerificationToken: token,
  });

  return token;
}
// ================= FORGOT PASSWORD =================

async forgotPassword(email: string): Promise<string> {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate a simple token (matching your email verification style)
    const resetToken = Buffer.from(`${user._id}-${Date.now()}-${Math.random()}`).toString('base64');

    // Store token and expiry
    (user as any).passwordResetToken = resetToken;
    (user as any).passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    // Send email with reset token
    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        name: user.name,
        resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      }
    });

    logger.info(`Password reset requested for: ${email}`);

    return resetToken;
  } catch (error) {
    logger.error('Forgot password error:', error);
    throw error;
  }
}

  // ================= PASSWORD RESET =================

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    // Since we're not using JWT, we can't decode the userId from the token
    // We need to find the user by the token directly
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    user.password = newPassword;
    (user as any).passwordResetToken = undefined;
    (user as any).passwordResetExpires = undefined;
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

      const isPasswordValid = await (user as any).comparePassword(currentPassword);

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

  async getUserFromCache(userId: string): Promise<IUser | null> { // Changed return type
    try {
      const cached = await redisClient.get(`user:${userId}`);

      if (!cached) return null;

      return JSON.parse(cached) as IUser;
    } catch (error) {
      logger.error('Cache read error:', error);
      return null;
    }
  }

  async cacheUserData(user: IUser): Promise<void> { // Changed parameter type
    try {
      const data = JSON.stringify(user);

      await redisClient.setEx(`user:${user._id}`, 3600, data);
      await redisClient.setEx(`user:${user._id}:profile`, 300, data);
    } catch (error) {
      logger.error('Cache write error:', error);
    }
  }

  // ================= PROFILE =================

  async getProfile(userId: string): Promise<IUser | null> { // Changed return type
    try {
      const cached = await redisClient.get(`user:${userId}:profile`);

      if (cached) {
        return JSON.parse(cached);
      }

      const user = await User.findById(userId)
        .select('-refreshToken -password')
        .populate('vehicleId', 'plateNumber model make');

      if (user) {
        // Convert to plain object before caching
        const userObject = (user as any).toObject ? (user as any).toObject() : user;
        await this.cacheUserData(userObject as IUser);
        return userObject as IUser;
      }

      return null;
    } catch (error) {
      logger.error('Profile fetch error:', error);
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    updates: Partial<IUser>
  ): Promise<IUser> { // Changed parameter and return type
    try {
      delete updates.password;
      delete updates.refreshToken;
      // Don't delete role - users shouldn't update their role anyway

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-refreshToken');

      if (!user) {
        throw new Error('User not found');
      }

      // Convert to plain object before returning
      const userObject = (user as any).toObject ? (user as any).toObject() : user;
      await this.cacheUserData(userObject as IUser);

      logger.info(`Profile updated: ${user.email}`);

      return userObject as IUser;
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
  // FIX: Use type assertion for payload
  const payload = { userId, role } as object;
  
  // FIX: Use type assertion for options
  const accessOptions = { expiresIn } as jwt.SignOptions;
  const refreshOptions = { expiresIn: this.TOKEN_EXPIRY.refresh } as jwt.SignOptions;

  const accessToken = jwt.sign(payload, appConfig.jwt.secret, accessOptions);
  const refreshToken = jwt.sign(payload, appConfig.jwt.refreshSecret, refreshOptions);

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