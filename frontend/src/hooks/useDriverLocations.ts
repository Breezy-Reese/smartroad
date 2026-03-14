import { useState } from 'react';
import { useSocketEvents } from './useSocketEvents';
import { DriverLocation, ResponderLocation } from '../types/location.types';

export interface LiveDriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  status: 'online' | 'offline' | 'driving' | 'emergency';
  updatedAt: Date;
}

export interface LiveResponderLocation {
  responderId: string;
  incidentId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: Date;
}

interface UseDriverLocationsReturn {
  driverLocations: Record<string, LiveDriverLocation>;
  responderLocations: Record<string, LiveResponderLocation>;
}

export const useDriverLocations = (): UseDriverLocationsReturn => {
  const [driverLocations, setDriverLocations]       = useState<Record<string, LiveDriverLocation>>({});
  const [responderLocations, setResponderLocations] = useState<Record<string, LiveResponderLocation>>({});

  useSocketEvents({
    onLocationUpdate: (data: DriverLocation) => {
      const driverId = (data as any).driverId ?? (data as any).id;
      if (!driverId) return;
      setDriverLocations((prev) => ({
        ...prev,
        [driverId]: {
          driverId,
          latitude:  (data as any).latitude  ?? (data as any).lat,
          longitude: (data as any).longitude ?? (data as any).lng,
          heading:   (data as any).heading,
          speed:     (data as any).speed,
          status:    prev[driverId]?.status ?? 'online',
          updatedAt: new Date(),
        },
      }));
    },

    onDriverStatusChange: (data) => {
      setDriverLocations((prev) => {
        const existing = prev[data.driverId];
        return {
          ...prev,
          [data.driverId]: {
            driverId:  data.driverId,
            latitude:  data.location?.latitude  ?? existing?.latitude  ?? 0,
            longitude: data.location?.longitude ?? existing?.longitude ?? 0,
            heading:   existing?.heading,
            speed:     existing?.speed,
            status:    data.status,
            updatedAt: new Date(),
          },
        };
      });
    },

    onResponderLocation: (data: ResponderLocation) => {
      const responderId = (data as any).responderId ?? (data as any).id;
      if (!responderId) return;
      setResponderLocations((prev) => ({
        ...prev,
        [responderId]: {
          responderId,
          incidentId: (data as any).incidentId ?? '',
          latitude:   (data as any).latitude  ?? (data as any).lat,
          longitude:  (data as any).longitude ?? (data as any).lng,
          heading:    (data as any).heading,
          speed:      (data as any).speed,
          updatedAt:  new Date(),
        },
      }));
    },
  });

  return { driverLocations, responderLocations };
};