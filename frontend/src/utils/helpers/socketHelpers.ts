import { Socket } from 'socket.io-client';

export const emitWithAck = <T>(
  socket: Socket,
  event: string,
  data: any,
  timeout: number = 5000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Socket timeout'));
    }, timeout);

    socket.emit(event, data, (response: T) => {
      clearTimeout(timeoutId);
      resolve(response);
    });
  });
};

export const waitForSocketConnection = (socket: Socket, maxAttempts: number = 10): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkConnection = () => {
      attempts++;
      if (socket.connected) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error('Socket connection timeout'));
      } else {
        setTimeout(checkConnection, 500);
      }
    };

    checkConnection();
  });
};

export const createSocketQueryParams = (params: Record<string, any>): string => {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
};