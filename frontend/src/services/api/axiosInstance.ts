import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

const redirectToLogin = () => {
  // Only redirect if not already on an auth page — prevents remount loop
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
  const alreadyThere = authPages.some(p => window.location.pathname.startsWith(p));
  if (!alreadyThere) {
    window.location.href = '/login';
  }
};

// ─── Request Interceptor ──────────────────────────────────────────────────────

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────

// Tracks in-flight refresh so concurrent 401s don't trigger multiple refreshes
let refreshPromise: Promise<string> | null = null;

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Fix: never intercept auth routes — they don't use tokens and
    // catching their 401s causes the redirect/remount loop
    const isAuthRoute = originalRequest?.url?.includes('/auth/');
    if (isAuthRoute) {
      return Promise.reject(error);
    }

    // Attempt token refresh on first 401 from a protected route
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!storedRefreshToken) {
        // No refresh token — session is gone, send to login
        clearAuth();
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        // Deduplicate: if another request already triggered a refresh, wait for it
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${baseURL}/auth/refresh-token`, { refreshToken: storedRefreshToken })
            .then((res) => {
              // Backend returns { success, data: { accessToken, refreshToken } }
              const { accessToken, refreshToken: newRefreshToken } = res.data.data;
              localStorage.setItem('token', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              return accessToken;
            })
            .catch((err) => {
              // Refresh failed — clear everything and redirect
              clearAuth();
              redirectToLogin();
              throw err;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);

      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;