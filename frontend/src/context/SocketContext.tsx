import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { socketClient } from '../config/socket.config';
import { ServerToClientEvents, ClientToServerEvents, SocketState } from '../types/socket.types';

interface SocketContextType extends SocketState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  emit: <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => void;
  on: <K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ) => void;
  off: <K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [state, setState] = useState<SocketState>({
    connected: false,
    reconnectAttempt: 0,
  });

  useEffect(() => {
    if (isAuthenticated && token && user) {
      const socketInstance = socketClient.getInstance(token);
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        setState(prev => ({ ...prev, connected: true, reconnectAttempt: 0 }));
        
        // Register user with socket
        if (user.role === 'driver') {
          socketInstance.emit('driver-connect', user._id);
        } else if (user.role === 'hospital') {
          socketInstance.emit('hospital-connect', user._id);
        } else if (user.role === 'responder') {
          socketInstance.emit('responder-connect', user._id);
        }
      });

      socketInstance.on('disconnect', () => {
        setState(prev => ({ ...prev, connected: false }));
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setState(prev => ({ 
          ...prev, 
          error: error.message,
          reconnectAttempt: prev.reconnectAttempt + 1 
        }));
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
        setState(prev => ({ ...prev, error: error.message }));
      });

      return () => {
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('connect_error');
        socketInstance.off('error');
      };
    } else {
      setSocket(null);
    }
  }, [isAuthenticated, token, user]);

  const emit = <K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => {
    if (socket && state.connected) {
      socket.emit(event, ...args);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const on = <K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ) => {
    if (socket) {
      socket.on(event, handler);
    }
  };

  const off = <K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ) => {
    if (socket) {
      if (handler) {
        socket.off(event, handler);
      } else {
        socket.off(event);
      }
    }
  };

  const value: SocketContextType = {
    ...state,
    socket,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};