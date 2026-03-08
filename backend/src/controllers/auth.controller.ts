import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

/* ============================================================
   REGISTER
============================================================ */

export const register = async (req: Request, res: Response) => {
  try {
    const { user, tokens } = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Register error', error?.message || error);

    return res.status(400).json({
      success: false,
      error: error?.message || 'Registration failed',
    });
  }
};

/* ============================================================
   LOGIN
============================================================ */

export const login = async (req: Request, res: Response) => {
  try {
    const { user, tokens } = await authService.login(req.body);

    return res.json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Login error', error?.message || error);

    return res.status(401).json({
      success: false,
      error: error?.message || 'Login failed',
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

    const tokens = await authService.refreshToken(refreshToken);

    return res.json({
      success: true,
      data: tokens,
    });
  } catch (error: any) {
    logger.error('Refresh token error', error?.message || error);

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
    });
  }
};

/* ============================================================
   LOGOUT
============================================================ */

export const logout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (userId) {
      await authService.logout(userId.toString());
    }

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    logger.error('Logout error', error?.message || error);

    return res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
};

/* ============================================================
   GET PROFILE
============================================================ */

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const profile = await authService.getProfile(userId.toString());

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    logger.error('Get profile error', error?.message || error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

/* ============================================================
   FORGOT PASSWORD
============================================================ */

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    await authService.forgotPassword(email); // removed unused resetToken variable

    return res.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error: any) {
    logger.error('Forgot password error', error?.message || error);

    return res.status(400).json({
      success: false,
      error: error?.message || 'Request failed',
    });
  }
};

/* ============================================================
   RESET PASSWORD
============================================================ */

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    await authService.resetPassword(token, newPassword);

    return res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error: any) {
    logger.error('Reset password error', error?.message || error);

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/* ============================================================
   CHANGE PASSWORD
============================================================ */

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
      userId.toString(),
      currentPassword,
      newPassword
    );

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    logger.error('Change password error', error?.message || error);

    return res.status(400).json({
      success: false,
      error: error?.message || 'Password change failed',
    });
  }
};

/* ============================================================
   VERIFY EMAIL
============================================================ */

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Token required',
      });
    }

    await authService.verifyEmail(token);

    return res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    logger.error('Verify email error', error?.message || error);

    return res.status(400).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/* ============================================================
   RESEND VERIFICATION EMAIL
============================================================ */

export function resendVerificationEmail(
  _arg0: string,
  _authenticate: (req: any, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>,
  _resendVerificationEmail: any
) {
  throw new Error('Function not implemented.');
}