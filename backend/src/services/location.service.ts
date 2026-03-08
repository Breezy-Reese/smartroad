import { ICoordinates } from '../types/user.types';

export interface INearestPoint extends ICoordinates {
  id: string;
  name?: string;
  distance: number;
}

class LocationService {
  // ================= DISTANCE =================

  calculateDistance(point1: ICoordinates, point2: ICoordinates): number {
    const R = 6371; // Earth radius in km

    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);

    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // ================= ETA =================

  calculateETA(
    origin: ICoordinates,
    destination: ICoordinates,
    averageSpeedKmH = 40
  ): number {
    const distance = this.calculateDistance(origin, destination);

    if (averageSpeedKmH <= 0) return 0;

    const hours = distance / averageSpeedKmH;

    return Math.ceil(hours * 60); // minutes
  }

  // ================= BEARING =================

  calculateBearing(point1: ICoordinates, point2: ICoordinates): number {
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);
    const dLng = this.toRad(point2.lng - point1.lng);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    let bearing = this.toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
  }

  getCardinalDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(bearing / 45) % 8];
  }

  // ================= GEOMETRY =================

  calculateMidpoint(p1: ICoordinates, p2: ICoordinates): ICoordinates {
    const lat1 = this.toRad(p1.lat);
    const lon1 = this.toRad(p1.lng);
    const lat2 = this.toRad(p2.lat);
    const lon2 = this.toRad(p2.lng);

    const dLon = lon2 - lon1;

    const Bx = Math.cos(lat2) * Math.cos(dLon);
    const By = Math.cos(lat2) * Math.sin(dLon);

    const lat3 = Math.atan2(
      Math.sin(lat1) + Math.sin(lat2),
      Math.sqrt(
        (Math.cos(lat1) + Bx) ** 2 + By ** 2
      )
    );

    const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

    return {
      lat: this.toDeg(lat3),
      lng: this.toDeg(lon3),
    };
  }

  // ================= RADIUS CHECK =================

  isWithinRadius(
    center: ICoordinates,
    point: ICoordinates,
    radiusKm: number
  ): boolean {
    return this.calculateDistance(center, point) <= radiusKm;
  }

  getBoundingBox(center: ICoordinates, radiusKm: number) {
    const latDelta = radiusKm / 111;
    const lngDelta =
      radiusKm / (111 * Math.cos(this.toRad(center.lat)));

    return {
      northEast: {
        lat: center.lat + latDelta,
        lng: center.lng + lngDelta,
      },
      southWest: {
        lat: center.lat - latDelta,
        lng: center.lng - lngDelta,
      },
    };
  }

  // ================= SEARCH HELPERS =================

  findNearestPoint(
    origin: ICoordinates,
    points: Array<ICoordinates & { id: string; name?: string }>
  ): INearestPoint | null {
    if (!points.length) return null;

    let nearest = points[0];
    let minDistance = this.calculateDistance(origin, nearest);

    for (let i = 1; i < points.length; i++) {
      const distance = this.calculateDistance(origin, points[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = points[i];
      }
    }

    return {
      ...nearest,
      distance: minDistance,
    };
  }

  filterPointsWithinRadius(
    origin: ICoordinates,
    points: Array<ICoordinates & { id: string }>,
    radiusKm: number
  ): Array<ICoordinates & { id: string; distance: number }> {
    return points
      .map(point => ({
        ...point,
        distance: this.calculateDistance(origin, point),
      }))
      .filter(point => point.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  // ================= ROUTE CALCULATION =================

  calculateRouteDistance(points: ICoordinates[]): number {
    let total = 0;

    for (let i = 0; i < points.length - 1; i++) {
      total += this.calculateDistance(points[i], points[i + 1]);
    }

    return total;
  }

  calculateCenterPoint(points: ICoordinates[]): ICoordinates {
    if (!points.length) return { lat: 0, lng: 0 };

    const sum = points.reduce(
      (acc, p) => {
        acc.lat += p.lat;
        acc.lng += p.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / points.length,
      lng: sum.lng / points.length,
    };
  }

  // ================= DATABASE STUBS =================

  async findNearbyHospitals(
    _location: ICoordinates,
    _radiusKm = 10
  ): Promise<any[]> {
    // Replace with MongoDB geospatial query
    return [];
  }

  async findNearbyResponders(
    _location: ICoordinates,
    _radiusKm = 5
  ): Promise<any[]> {
    // Replace with real DB query later
    return [];
  }

  // ================= GEOFENCE =================

  isPointInPolygon(
    point: ICoordinates,
    polygon: ICoordinates[]
  ): boolean {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect =
        yi > point.lat !== yj > point.lat &&
        point.lng <
          ((xj - xi) * (point.lat - yi)) / (yj - yi + 0.0000001) +
            xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  // ================= TEST UTIL =================

  generateRandomPoint(center: ICoordinates, radiusKm: number): ICoordinates {
    const radiusDeg = radiusKm / 111;

    const u = Math.random();
    const v = Math.random();

    const w = radiusDeg * Math.sqrt(u);
    const t = 2 * Math.PI * v;

    return {
      lat: center.lat + w * Math.cos(t),
      lng: center.lng + w * Math.sin(t),
    };
  }

  // ================= UTIL CONVERTERS =================

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }
}

export const locationService = new LocationService();