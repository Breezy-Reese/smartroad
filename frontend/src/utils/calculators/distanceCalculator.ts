import { Coordinates } from '../../types/location.types';

export const haversineDistance = (point1: Coordinates, point2: Coordinates): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const toRad = (degrees: number): number => {
  return degrees * Math.PI / 180;
};

export const toDeg = (radians: number): number => {
  return radians * 180 / Math.PI;
};

export const calculateRouteDistance = (points: Coordinates[]): number => {
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += haversineDistance(points[i], points[i + 1]);
  }
  return totalDistance;
};

export const calculateManhattanDistance = (point1: Coordinates, point2: Coordinates): number => {
  return Math.abs(point2.lat - point1.lat) + Math.abs(point2.lng - point1.lng);
};

export const calculateBoundingBox = (
  center: Coordinates,
  radiusKm: number
): { northEast: Coordinates; southWest: Coordinates } => {
  const latChange = radiusKm / 111; // 1 degree lat ≈ 111 km
  const lngChange = radiusKm / (111 * Math.cos(toRad(center.lat)));

  return {
    northEast: {
      lat: center.lat + latChange,
      lng: center.lng + lngChange,
    },
    southWest: {
      lat: center.lat - latChange,
      lng: center.lng - lngChange,
    },
  };
};