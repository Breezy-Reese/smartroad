import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { appConfig } from '../config/app.config';
import { ILoginRequest, IAuthTokens } from '../types/user.types';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/email.service';

/* ============================================================
   TOKEN GENERATOR
============================================================ */

const generateTokens = (
  userId: string,
  role: string,
  expiresIn: string = appConfig.jwt.expiresIn
): IAuthTokens => {
  const payload = {
    userId,
    role,
  };

  const accessToken = jwt.sign(payload, appConfig.jwt.secret, {
    expiresIn,
  });

  const refreshToken = jwt.sign(payload, appConfig.jwt.refreshSecret, {
    expiresIn: appConfig.jwt.refreshExpiresIn || '30d',
  });

  return { accessToken, refreshToken };
};

/* ============================================================
   REGISTER
============================================================ */

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, phone, licenseNumber, hospitalName } =
      req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email',
      });
    }

    const userData: any = {
      name,
      email,
      password,
      role,
      phone,
    };

    if (role === 'driver' && licenseNumber) {
      userData.licenseNumber = licenseNumber;
      userData.licenseExpiry = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      );
    }

    if (role === 'hospital' && hospitalName) {
      userData.hospitalName = hospitalName;
    }

    const user = new User(userData);
    await user.save();

    const tokens = generateTokens(user._id.toString(), user.role);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Smart Accident Detection System',
        template: 'welcome',
        data: { name: user.name },
      });
    } catch (emailError) {
      logger.error('Welcome email failed', emailError);
    }

    return res.status(201).json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      },
    });
  } catch (error) {
    logger.error('Register error', error);

    return res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
};

/* ============================================================
   LOGIN
============================================================ */

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe }: ILoginRequest = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    const isValid = await user.comparePassword(password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    user.lastLogin = new Date();

    const expiresIn = rememberMe ? '30d' : '7d';
    const tokens = generateTokens(
      user._id.toString(),
      user.role,
      expiresIn
    );

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      },
    });
  } catch (error) {
    logger.error('Login error', error);

    return res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
};

/* ============================================================
   REFRESH TOKEN
============================================================ */

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      appConfig.jwt.refreshSecret
    ) as any;

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

    const tokens = generateTokens(user._id.toString(), user.role);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    logger.error('Refresh token error', error);

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/* ============================================================
   LOGOUT
============================================================ */

export const logout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        refreshToken: undefined,
      });
    }

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error', error);

    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
};

/* ============================================================
   GET ME
============================================================ */

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get me error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get profile',
    });
  }
};

/* ============================================================
   FORGOT PASSWORD
============================================================ */

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

    const resetToken = jwt.sign(
      { userId: user._id },
      appConfig.jwt.secret,
      { expiresIn: '1h' }
    );

    await sendEmail({
      to: user.email,
      subject: 'Password Reset',
      template: 'password-reset',
      data: {
        name: user.name,
        resetLink: `${appConfig.clientUrl}/reset-password?token=${resetToken}`,
      },
    });

    return res.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    logger.error('Forgot password error', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
    });
  }
};

/* ============================================================
   RESET PASSWORD
============================================================ */

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, appConfig.jwt.secret) as any;

    const user = await User.findById(decoded.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.password = newPassword;
    user.refreshToken = undefined;

    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    logger.error('Reset password error', error);

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/* ============================================================
   PLACEHOLDER FUNCTIONS (FIX TS ERROR)
============================================================ */

export const verifyEmail = async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'Verify email endpoint ready',
  });
};

export const resendVerificationEmail = async (
  _req: Request,
  res: Response
) => {
  return res.json({
    success: true,
    message: 'Resend verification email endpoint ready',
  });
};

export const changePassword = async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'Change password endpoint ready',
  });
};