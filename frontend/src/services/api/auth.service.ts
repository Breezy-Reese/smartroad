import axiosInstance from './axiosInstance';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../../types/user.types';

class AuthService {
  private baseUrl = '/auth';

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      `${this.baseUrl}/login`,
      credentials
    );

    // Backend returns { success, data: { user, accessToken, refreshToken } }
    const { accessToken, refreshToken } = response.data.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    return response.data;
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      `${this.baseUrl}/register`,
      data
    );

    // Store tokens on successful registration too
    const { accessToken, refreshToken } = response.data.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    return response.data;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    try {
      await axiosInstance.post(`${this.baseUrl}/logout`);
    } finally {
      // Always clear storage even if the request fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  // ─── Get Current User ─────────────────────────────────────────────────────
  async getCurrentUser(): Promise<User> {
    const response = await axiosInstance.get<User>(`${this.baseUrl}/me`);
    return response.data;
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────
  // Fixed: endpoint was /auth/refresh — backend expects /auth/refresh-token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await axiosInstance.post<{ accessToken: string }>(
      `${this.baseUrl}/refresh-token`,
      { refreshToken }
    );
    return response.data;
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await axiosInstance.post(
      `${this.baseUrl}/forgot-password`,
      { email }
    );
    return response.data;
  }

  // ─── Reset Password ───────────────────────────────────────────────────────
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await axiosInstance.post(`${this.baseUrl}/reset-password`, {
      token,
      newPassword: password, // Backend expects 'newPassword' per resetPasswordValidation
    });
    return response.data;
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────
  // Backend uses GET /verify-email/:token (route param), not POST with body
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await axiosInstance.get(
      `${this.baseUrl}/verify-email/${token}`
    );
    return response.data;
  }

  // ─── Change Password ──────────────────────────────────────────────────────
  // Backend expects 'currentPassword' + 'newPassword' per changePasswordValidation
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const response = await axiosInstance.post(`${this.baseUrl}/change-password`, {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  // ─── Resend Verification Email ────────────────────────────────────────────
  async resendVerificationEmail(): Promise<{ message: string }> {
    const response = await axiosInstance.post(
      `${this.baseUrl}/resend-verification`
    );
    return response.data;
  }
}

export const authService = new AuthService();