// src/context/LocationContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { LocationData, Coordinates } from '../types';
import { toast } from 'react-hot-toast';
import { config } from '../config/env.config';

interface LocationContextType {
  location: LocationData | null;
  error: string | null;
  loading: boolean;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<Coordinates | null>;
  calculateDistance: (from: Coordinates, to: Coordinates) => number;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      toast.error('Geolocation not supported');
      return;
    }

    // Check permissions
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'denied') {
        setError('Location permission denied');
        toast.error('Please enable location access');
      }
    });

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const handleLocationSuccess = useCallback((position: GeolocationPosition) => {
    const newLocation: LocationData = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: position.coords.speed || 0,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading || undefined,
      altitude: position.coords.altitude || undefined,
      timestamp: new Date()
    };

    setLocation(newLocation);
    setError(null);

    // Send location update if tracking and connected
    if (isTracking && socket && connected && user) {
      socket.emit('location-update', {
        driverId: user._id,
        ...newLocation
      });
    }
  }, [socket, connected, user, isTracking]);

  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    let message = 'Failed to get location';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
    }
    setError(message);
    toast.error(message);
  }, []);

  const getCurrentLocation = useCallback((): Promise<Coordinates | null> => {
    return new Promise((resolve) => {
      setLoading(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationSuccess(position);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoading(false);
        },
        (error) => {
          handleLocationError(error);
          resolve(null);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, [handleLocationSuccess, handleLocationError]);

  const startTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    setIsTracking(true);
    
    watchId.current = navigator.geolocation.watchPosition(
      handleLocationSuccess,
      handleLocationError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );

    toast.success('Location tracking started');
  }, [handleLocationSuccess, handleLocationError]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
    toast.success('Location tracking stopped');
  }, []);

  const calculateDistance = useCallback((from: Coordinates, to: Coordinates): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const value: LocationContextType = {
    location,
    error,
    loading,
    isTracking,
    startTracking,
    stopTracking,
    getCurrentLocation,
    calculateDistance
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};