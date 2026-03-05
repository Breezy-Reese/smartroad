import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config/app.config';
import { logger } from './logger';
import { redisClient } from '../config/redis.config';

let io: SocketServer;

export const initializeSocket = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, appConfig.jwt.secret) as any;
      
      // Check if token is blacklisted
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return next(new Error('Token has been revoked'));
      }

      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const role = socket.data.role;

    logger.info(`Socket connected: ${socket.id} - User: ${userId} (${role})`);

    // Join user to their room
    socket.join(`user:${userId}`);
    
    // Join role-based room
    socket.join(`role:${role}`);

    // Handle driver connection
    if (role === 'driver') {
      socket.join('drivers');
      socket.join(`driver:${userId}`);
      
      // Broadcast driver online status
      socket.broadcast.emit('driver-status-change', {
        driverId: userId,
        status: 'online',
      });
    }

    // Handle hospital connection
    if (role === 'hospital') {
      socket.join('hospitals');
      socket.join(`hospital:${userId}`);
    }

    // Handle responder connection
    if (role === 'responder') {
      socket.join('responders');
      socket.join(`responder:${userId}`);
    }

    // Handle joining incident room
    socket.on('join-incident', (incidentId: string) => {
      socket.join(`incident:${incidentId}`);
      logger.debug(`Socket ${socket.id} joined incident room: ${incidentId}`);
    });

    // Handle leaving incident room
    socket.on('leave-incident', (incidentId: string) => {
      socket.leave(`incident:${incidentId}`);
      logger.debug(`Socket ${socket.id} left incident room: ${incidentId}`);
    });

    // Handle location updates
    socket.on('location-update', (data) => {
      if (role === 'driver') {
        // Broadcast to hospitals and responders tracking this driver
        socket.to(`tracking:${userId}`).emit('driver-location', {
          driverId: userId,
          ...data,
        });

        // Update in Redis
        redisClient.setex(
          `driver:location:${userId}`,
          30, // 30 seconds TTL
          JSON.stringify(data)
        );
      }
    });

    // Handle start tracking
    socket.on('start-tracking', (driverId: string) => {
      socket.join(`tracking:${driverId}`);
      logger.debug(`Socket ${socket.id} started tracking driver: ${driverId}`);
    });

    // Handle stop tracking
    socket.on('stop-tracking', (driverId: string) => {
      socket.leave(`tracking:${driverId}`);
      logger.debug(`Socket ${socket.id} stopped tracking driver: ${driverId}`);
    });

    // Handle panic button
    socket.on('panic-button', async (data) => {
      if (role === 'driver') {
        logger.warn(`PANIC BUTTON triggered by driver: ${userId}`);
        
        // Broadcast to all hospitals
        socket.to('hospitals').emit('panic-alert', {
          driverId: userId,
          ...data,
        });

        // Store in Redis
        await redisClient.setex(
          `panic:${userId}`,
          300, // 5 minutes
          JSON.stringify(data)
        );
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} - User: ${userId}`);

      if (role === 'driver') {
        // Broadcast offline status
        socket.broadcast.emit('driver-status-change', {
          driverId: userId,
          status: 'offline',
        });

        // Remove from Redis
        redisClient.del(`driver:location:${userId}`);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Helper functions for emitting events
export const emitToUser = (userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToRole = (role: string, event: string, data: any) => {
  io.to(`role:${role}`).emit(event, data);
};

export const emitToIncident = (incidentId: string, event: string, data: any) => {
  io.to(`incident:${incidentId}`).emit(event, data);
};

export const emitToDrivers = (event: string, data: any) => {
  io.to('drivers').emit(event, data);
};

export const emitToHospitals = (event: string, data: any) => {
  io.to('hospitals').emit(event, data);
};

export const emitToResponders = (event: string, data: any) => {
  io.to('responders').emit(event, data);
};