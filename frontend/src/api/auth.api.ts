// src/api/auth.api.ts
import apiClient, { tokenStorage } from './client';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'driver' | 'hospital' | 'admin' | 'responder';
  phone: string;
  licenseNumber?: string;
  hospitalName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      _id: string;
      name: string;
      email: string;
      role: string;
      phone: string;
      isActive: boolean;
      isVerified: boolean;
    };
    accessToken: string;
    refreshToken: string;
  };
}

// ============================================================
// AUTH API
// ============================================================

export const authApi = {

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    if (data.data.accessToken) {
      tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
    }
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    if (data.data.accessToken) {
      tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      tokenStorage.clearTokens();
    }
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const refreshToken = tokenStorage.getRefreshToken();
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken });
    if (data.data.accessToken) {
      tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
    }
    return data;
  },

  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (token: string, password: string) => {
    const { data } = await apiClient.post('/auth/reset-password', { token, password });
    return data;
  },
};
