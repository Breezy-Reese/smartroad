import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config } from './env.config';
import { ApiError } from '../types/api.types';

class AxiosConfig {
  private static instance: AxiosInstance;
  private static refreshPromise: Promise<string> | null = null;

  static getInstance(): AxiosInstance {
    if (!AxiosConfig.instance) {
      AxiosConfig.instance = axios.create({
        baseURL: config.apiUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Request interceptor
      AxiosConfig.instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          // Add request ID for tracking
          config.headers['X-Request-ID'] = Math.random().toString(36).substring(7);
          
          // Add timestamp
          config.headers['X-Timestamp'] = Date.now().toString();
          
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
      );

      // Response interceptor
      AxiosConfig.instance.interceptors.response.use(
        (response) => response,
        async (error: AxiosError<ApiError>) => {
          const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
          
          // Handle token refresh
          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              const refreshToken = localStorage.getItem('refreshToken');
              if (!refreshToken) {
                throw new Error('No refresh token');
              }
              
              // Wait for existing refresh to complete
              if (!AxiosConfig.refreshPromise) {
                AxiosConfig.refreshPromise = axios
                  .post(`${config.apiUrl}/auth/refresh`, { refreshToken })
                  .then((response) => {
                    const { token } = response.data;
                    localStorage.setItem('token', token);
                    return token;
                  })
                  .catch((err) => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                    throw err;
                  })
                  .finally(() => {
                    AxiosConfig.refreshPromise = null;
                  });
              }
              
              const newToken = await AxiosConfig.refreshPromise;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return AxiosConfig.instance(originalRequest);
              
            } catch (refreshError) {
              return Promise.reject(refreshError);
            }
          }
          
          // Handle other errors
          return Promise.reject(AxiosConfig.handleError(error));
        }
      );
    }

    return AxiosConfig.instance;
  }

  private static handleError(error: AxiosError<ApiError>): Error {
    if (error.response) {
      // Server responded with error
      const apiError: ApiError = {
        message: error.response.data?.message || 'An error occurred',
        code: error.response.data?.code || 'UNKNOWN_ERROR',
        status: error.response.status,
        details: error.response.data?.details,
      };
      return new Error(apiError.message);
    } else if (error.request) {
      // Request made but no response
      return new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      return new Error('An unexpected error occurred');
    }
  }
}

export const axiosInstance = AxiosConfig.getInstance();