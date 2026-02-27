import { useEffect, useCallback } from 'react';
import { useSocket as useSocketContext } from '../context/SocketContext';
import { ServerToClientEvents, ClientToServerEvents } from '../types/socket.types';

export const useSocket = () => {
  const socket = useSocketContext();

  const emit = useCallback(<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) => {
    socket.emit(event, ...args);
  }, [socket]);

  const on = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ) => {
    socket.on(event, handler);
  }, [socket]);

  const off = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ) => {
    socket.off(event, handler);
  }, [socket]);

  useEffect(() => {
    return () => {
      // Cleanup all listeners on unmount
      if (socket.socket) {
        socket.socket.removeAllListeners();
      }
    };
  }, [socket]);

  return {
    ...socket,
    emit,
    on,
    off,
  };
};