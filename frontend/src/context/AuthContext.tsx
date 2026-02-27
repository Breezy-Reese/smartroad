import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../config/axios.config';
import { User, AuthState, LoginCredentials, RegisterData } from '../types/user.types';
import { socketClient } from '../config/socket.config';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (state.token) {
      loadUser();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.token]);

  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      // Initialize socket connection
      socketClient.getInstance(state.token || undefined);
    } else {
      socketClient.disconnect();
    }
  }, [state.isAuthenticated, state.user, state.token]);

  const loadUser = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await axiosInstance.get<User>('/auth/me');
      
      setState(prev => ({
        ...prev,
        user: response.data,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load user:', error);
      logout();
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await axiosInstance.post<{ token: string; refreshToken: string; user: User }>(
        '/auth/login',
        credentials
      );

      const { token, refreshToken, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      setState({
        user,
        token,
        refreshToken,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      });

      // Redirect based on role
      if (user.role === 'driver') {
        navigate('/driver');
      } else if (user.role === 'hospital') {
        navigate('/hospital');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
        isAuthenticated: false,
      }));
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await axiosInstance.post<{ token: string; refreshToken: string; user: User }>(
        '/auth/register',
        data
      );

      const { token, refreshToken, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      setState({
        user,
        token,
        refreshToken,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      });

      // Redirect based on role
      if (user.role === 'driver') {
        navigate('/driver');
      } else if (user.role === 'hospital') {
        navigate('/hospital');
      } else {
        navigate('/');
      }

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed',
        isAuthenticated: false,
      }));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    socketClient.disconnect();

    setState({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
    });

    navigate('/login');
  };

  const updateUser = (userData: Partial<User>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null,
    }));
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};