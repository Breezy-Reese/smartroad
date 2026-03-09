// src/api/services/auth.service.ts
import axios from 'axios';  // Add this at the top
import { api, tokenStorage, ApiError } from '../client';  // Added ApiError
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  IUser,
  ApiResponse,
} from '../types';

export const authService = {
  // ─── Register ───────────────────────────────────────────────────────────────
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const res = await api.post<AuthResponse>('/auth/register', payload, {
        skipAuth: true,
      });
      
      if (res.data?.accessToken && res.data?.refreshToken) {
        tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
        tokenStorage.setUser(res.data.user);
      }
      
      return res.data;  // Return the data property, not the whole response
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data?.message || 'Registration failed',
          error.response?.status
        );
      }
      throw error;
    }
  },

  // ─── Login ──────────────────────────────────────────────────────────────────
  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const res = await api.post<AuthResponse>('/auth/login', payload, {
        skipAuth: true,
      });
      
      if (res.data?.accessToken && res.data?.refreshToken) {
        tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
        tokenStorage.setUser(res.data.user);
      }
      
      return res.data;  // Return the data property
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data?.message || 'Login failed',
          error.response?.status
        );
      }
      throw error;
    }
  },

  // ─── Logout ─────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    } finally {
      tokenStorage.clearTokens();
    }
  },

  // ─── Get Current User ────────────────────────────────────────────────────────
  async getMe(): Promise<IUser> {
    try {
      const res = await api.get<ApiResponse<IUser>>('/auth/me');
      if (res.data) {
        tokenStorage.setUser(res.data);
      }
      return res.data!;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data?.message || 'Failed to get user',
          error.response?.status
        );
      }
      throw error;
    }
  },

  // ─── Update Profile ──────────────────────────────────────────────────────────
  async updateProfile(data: Partial<IUser>): Promise<IUser> {
    try {
      const res = await api.put<ApiResponse<IUser>>('/auth/profile', data);
      if (res.data) {
        tokenStorage.setUser(res.data);
      }
      return res.data!;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data?.message || 'Failed to update profile',
          error.response?.status
        );
      }
      throw error;
    }
  },

  // ─── Change Password ─────────────────────────────────────────────────────────
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data?.message || 'Failed to change password',
          error.response?.status
        );
      }
      throw error;
    }
  },

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<void> {
    try {
      await api.post('/auth/forgot-password', { email }, { skipAuth: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data?.message || 'Failed to process forgot password',
          error.response?.status
        );
      }
      throw error;
    }
  },

  // ─── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await api.post('/auth/reset-password', { token, password }, { skipAuth: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data?.message || 'Failed to reset password',
          error.response?.status
        );
      }
      throw error;
    }
  },

  // ─── Verify Email ────────────────────────────────────────────────────────────
  async verifyEmail(token: string): Promise<void> {
    try {
      await api.post('/auth/verify-email', { token }, { skipAuth: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.response?.data?.message || 'Failed to verify email',
          error.response?.status
        );
      }
      throw error;
    }
  },

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  isAuthenticated(): boolean {
    return !!tokenStorage.getAccessToken();
  },

  getCurrentUser(): IUser | null {
    return tokenStorage.getUser();
  },
};