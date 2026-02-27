import { Coordinates } from '../../types/location.types';

export const getBoundsFromPoints = (points: Coordinates[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} => {
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
};

export const getCenterPoint = (points: Coordinates[]): Coordinates => {
  const bounds = getBoundsFromPoints(points);
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
};

export const getZoomLevel = (bounds: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}): number => {
  const latDiff = bounds.maxLat - bounds.minLat;
  const lngDiff = bounds.maxLng - bounds.minLng;
  const maxDiff = Math.max(latDiff, lngDiff);
  
  if (maxDiff < 0.0001) return 18;
  if (maxDiff < 0.001) return 16;
  if (maxDiff < 0.01) return 14;
  if (maxDiff < 0.1) return 12;
  if (maxDiff < 1) return 10;
  if (maxDiff < 10) return 8;
  return 6;
};

export const isPointWithinRadius = (
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean => {
  const R = 6371; // Earth's radius in km
  const dLat = (point.lat - center.lat) * Math.PI / 180;
  const dLon = (point.lng - center.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(center.lat * Math.PI / 180) * Math.cos(point.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance <= radiusKm;
};