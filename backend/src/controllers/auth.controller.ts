import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { appConfig } from '../config/app.config';
import { ILoginRequest, IRegisterRequest, IAuthTokens } from '../types/user.types';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/email.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, phone, licenseNumber, hospitalName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email',
      });
    }

    // Create user based on role
    const userData: any = {
      name,
      email,
      password,
      role,
      phone,
    };

    if (role === 'driver' && licenseNumber) {
      userData.licenseNumber = licenseNumber;
      userData.licenseExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    }

    if (role === 'hospital' && hospitalName) {
      userData.hospitalName = hospitalName;
    }

    const user = new User(userData);
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user._id.toString(), user.role);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Send welcome email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Smart Accident Detection System',
        template: 'welcome',
        data: { name: user.name },
      });
    } catch (emailError) {
      logger.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe }: ILoginRequest = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    
    // Generate tokens
    const expiresIn = rememberMe ? '30d' : '7d';
    const tokens = generateTokens(user._id.toString(), user.role, expiresIn);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, appConfig.jwt.refreshSecret) as any;

    // Find user with refresh token
    const user = await User.findOne({ 
      _id: decoded.userId,
      refreshToken,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id.toString(), user.role);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (userId) {
      // Clear refresh token
      await User.findByIdAndUpdate(userId, { refreshToken: null });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      appConfig.jwt.secret,
      { expiresIn: '1h' }
    );

    // Send reset email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        name: user.name,
        resetLink: `${appConfig.clientUrl}/reset-password?token=${resetToken}`,
      },
    });

    res.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

    // Find user
    const user = await User.findById(decoded.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update password
    user.password = newPassword;
    user.refreshToken = null; // Invalidate all sessions
    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Successful',
      template: 'password-reset-confirmation',
      data: { name: user.name },
    });

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

const generateTokens = (
  userId: string,
  role: string,
  expiresIn: string = appConfig.jwt.expiresIn
): IAuthTokens => {
  const accessToken = jwt.sign(
    { userId, role },
    appConfig.jwt.secret,
    { expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId },
    appConfig.jwt.refreshSecret,
    { expiresIn: appConfig.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};