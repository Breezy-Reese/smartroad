// src/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================================
// AXIOS INSTANCE
// ============================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// ERROR CLASS
// ============================================================
export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}
// ============================================================
// TOKEN HELPERS
// ============================================================

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  // Add these if they don't exist
  setUser: (user: any) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
  getUser: (): any | null => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

// ============================================================
// REQUEST INTERCEPTOR — attach token
// ============================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR — handle 401, refresh token
// ============================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;

        tokenStorage.setTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// API wrapper export with skipAuth support
// ============================================================
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig & { skipAuth?: boolean }) => {
    const { skipAuth, ...axiosConfig } = config || {};
    // If skipAuth is true, we could modify headers or use a different instance
    // For now, we'll just pass the config through
    return apiClient.get<T>(url, axiosConfig);
  },
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig & { skipAuth?: boolean }) => {
    const { skipAuth, ...axiosConfig } = config || {};
    return apiClient.post<T>(url, data, axiosConfig);
  },
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig & { skipAuth?: boolean }) => {
    const { skipAuth, ...axiosConfig } = config || {};
    return apiClient.put<T>(url, data, axiosConfig);
  },
  
  delete: <T>(url: string, config?: AxiosRequestConfig & { skipAuth?: boolean }) => {
    const { skipAuth, ...axiosConfig } = config || {};
    return apiClient.delete<T>(url, axiosConfig);
  },
  
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig & { skipAuth?: boolean }) => {
    const { skipAuth, ...axiosConfig } = config || {};
    return apiClient.patch<T>(url, data, axiosConfig);
  },
};