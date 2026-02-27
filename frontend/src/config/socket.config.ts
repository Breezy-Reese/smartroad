import { io, Socket } from 'socket.io-client';
import { config } from './env.config';
import { SocketConfig, ServerToClientEvents, ClientToServerEvents } from '../types/socket.types';

class SocketClient {
  private static instance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;

  static getInstance(token?: string): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!SocketClient.instance) {
      const socketConfig: SocketConfig['options'] = {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: SocketClient.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
        query: token ? { token } : undefined,
        auth: token ? { token } : undefined,
      };

      SocketClient.instance = io(config.socketUrl, socketConfig);

      // Setup default event handlers
      SocketClient.instance.on('connect', () => {
        console.log('Socket connected');
        SocketClient.reconnectAttempts = 0;
      });

      SocketClient.instance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      SocketClient.instance.on('error', (error) => {
        console.error('Socket error:', error);
      });

      SocketClient.instance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        SocketClient.reconnectAttempts++;
        
        if (SocketClient.reconnectAttempts >= SocketClient.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          SocketClient.instance?.close();
        }
      });
    }

    return SocketClient.instance;
  }

  static disconnect(): void {
    if (SocketClient.instance) {
      SocketClient.instance.disconnect();
      SocketClient.instance = null;
    }
  }

  static updateToken(token: string): void {
    if (SocketClient.instance) {
      SocketClient.instance.auth = { token };
      SocketClient.instance.disconnect().connect();
    }
  }
}

export const socketClient = SocketClient;