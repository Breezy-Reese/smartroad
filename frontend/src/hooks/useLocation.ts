import { useState, useEffect, useCallback } from 'react';
import { LocationData, Coordinates } from '../types/location.types';
import { toast } from 'react-hot-toast';

interface UseLocationReturn {
  location: LocationData | null;
  error: string | null;
  loading: boolean;
  getCurrentLocation: () => Promise<LocationData>;
  startWatching: () => void;
  stopWatching: () => void;
  calculateDistance: (point1: Coordinates, point2: Coordinates) => number;
  isWatching: boolean;
}

export const useLocation = (options?: PositionOptions): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...options,
  };

  const handleSuccess = (position: GeolocationPosition): void => {
    const locationData: LocationData = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: position.coords.speed || 0,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading || undefined,
      altitude: position.coords.altitude || undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
      timestamp: new Date(position.timestamp),
    };
    setLocation(locationData);
    setError(null);
  };

  const handleError = (error: GeolocationPositionError): void => {
    let errorMessage = 'Failed to get location';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timeout';
        break;
    }
    setError(errorMessage);
    toast.error(errorMessage);
  };

  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported';
        setError(error);
        reject(error);
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            speed: position.coords.speed || 0,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            timestamp: new Date(position.timestamp),
          };
          setLocation(locationData);
          setLoading(false);
          resolve(locationData);
        },
        (error) => {
          handleError(error);
          setLoading(false);
          reject(error);
        },
        defaultOptions
      );
    });
  }, [defaultOptions]);

  const startWatching = useCallback((): void => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    if (watchId !== null) return;

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      defaultOptions
    );

    setWatchId(id);
    setIsWatching(true);
  }, [defaultOptions, watchId]);

  const stopWatching = useCallback((): void => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsWatching(false);
    }
  }, [watchId]);

  const calculateDistance = useCallback((point1: Coordinates, point2: Coordinates): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    location,
    error,
    loading,
    getCurrentLocation,
    startWatching,
    stopWatching,
    calculateDistance,
    isWatching,
  };
};