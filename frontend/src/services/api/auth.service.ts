import axiosInstance from './axiosInstance';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../../types/user.types';

class AuthService {
  private baseUrl = '/auth';

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(`${this.baseUrl}/login`, credentials);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(`${this.baseUrl}/register`, data);
    return response.data;
  }

  async logout(): Promise<void> {
    await axiosInstance.post(`${this.baseUrl}/logout`);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  async getCurrentUser(): Promise<User> {
    const response = await axiosInstance.get<User>(`${this.baseUrl}/me`);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await axiosInstance.post<{ token: string }>(`${this.baseUrl}/refresh`, {
      refreshToken,
    });
    return response.data;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await axiosInstance.post(`${this.baseUrl}/forgot-password`, { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await axiosInstance.post(`${this.baseUrl}/reset-password`, {
      token,
      password,
    });
    return response.data;
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await axiosInstance.post(`${this.baseUrl}/verify-email`, { token });
    return response.data;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await axiosInstance.post(`${this.baseUrl}/change-password`, {
      oldPassword,
      newPassword,
    });
    return response.data;
  }
}

export const authService = new AuthService();