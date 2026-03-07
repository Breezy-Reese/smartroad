import { ICoordinates } from '../types/user.types';

class LocationService {
  // Calculate distance between two points in kilometers (Haversine formula)
  calculateDistance(point1: ICoordinates, point2: ICoordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  // Calculate ETA in minutes based on distance and average speed
  calculateETA(
    origin: ICoordinates,
    destination: ICoordinates,
    averageSpeed: number = 40 // km/h
  ): number {
    const distance = this.calculateDistance(origin, destination);
    const timeHours = distance / averageSpeed;
    return Math.ceil(timeHours * 60); // Convert to minutes
  }

  // Calculate bearing between two points
  calculateBearing(point1: ICoordinates, point2: ICoordinates): number {
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);
    const dLon = this.toRad(point2.lng - point1.lng);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = Math.atan2(y, x);
    bearing = this.toDeg(bearing);
    bearing = (bearing + 360) % 360; // Normalize to 0-360

    return bearing;
  }

  // Get cardinal direction from bearing
  getCardinalDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  // Calculate midpoint between two points
  calculateMidpoint(point1: ICoordinates, point2: ICoordinates): ICoordinates {
    const lat1 = this.toRad(point1.lat);
    const lon1 = this.toRad(point1.lng);
    const lat2 = this.toRad(point2.lat);
    const lon2 = this.toRad(point2.lng);

    const dLon = lon2 - lon1;

    const Bx = Math.cos(lat2) * Math.cos(dLon);
    const By = Math.cos(lat2) * Math.sin(dLon);

    const lat3 = Math.atan2(
      Math.sin(lat1) + Math.sin(lat2),
      Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By)
    );
    const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

    return {
      lat: this.toDeg(lat3),
      lng: this.toDeg(lon3),
    };
  }

  // Check if a point is within a radius of another point
  isWithinRadius(
    center: ICoordinates,
    point: ICoordinates,
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusKm;
  }

  // Get bounding box coordinates for a radius around a point
  getBoundingBox(
    center: ICoordinates,
    radiusKm: number
  ): {
    northEast: ICoordinates;
    southWest: ICoordinates;
  } {
    const latChange = radiusKm / 111; // 1 degree lat ≈ 111 km
    const lngChange = radiusKm / (111 * Math.cos(this.toRad(center.lat)));

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
  }

  // Find nearest point from a list of points
  findNearestPoint(
    origin: ICoordinates,
    points: Array<ICoordinates & { id: string; name?: string }>
  ): (ICoordinates & { id: string; name?: string; distance: number }) | null {
    if (points.length === 0) return null;

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

  // Filter points within radius
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

  // Calculate route distance from array of points
  calculateRouteDistance(points: ICoordinates[]): number {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.calculateDistance(points[i], points[i + 1]);
    }
    return totalDistance;
  }

  // Calculate center point of multiple coordinates
  calculateCenterPoint(points: ICoordinates[]): ICoordinates {
    if (points.length === 0) {
      return { lat: 0, lng: 0 };
    }

    let sumLat = 0;
    let sumLng = 0;

    points.forEach(point => {
      sumLat += point.lat;
      sumLng += point.lng;
    });

    return {
      lat: sumLat / points.length,
      lng: sumLng / points.length,
    };
  }

  // Find nearby hospitals (simulated - would use database query with geospatial index)
  async findNearbyHospitals(
    _location: ICoordinates,
    _radiusKm: number = 10
  ): Promise<any[]> {
    // This would be implemented with actual database query
    // For now, return empty array
    return [];
  }

  // Find nearby responders (simulated - would use database query with geospatial index)
  async findNearbyResponders(
    _location: ICoordinates,
    _radiusKm: number = 5
  ): Promise<any[]> {
    // This would be implemented with actual database query
    // For now, return empty array
    return [];
  }

  // Check if point is within geofence (polygon)
  isPointInPolygon(point: ICoordinates, polygon: ICoordinates[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;

      const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Generate random point within radius (for testing)
  generateRandomPoint(center: ICoordinates, radiusKm: number): ICoordinates {
    const radiusInDegrees = radiusKm / 111; // Convert km to degrees
    const u = Math.random();
    const v = Math.random();
    const w = radiusInDegrees * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    return {
      lat: center.lat + y,
      lng: center.lng + x,
    };
  }

  // Convert degrees to radians
  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  // Convert radians to degrees
  private toDeg(radians: number): number {
    return radians * 180 / Math.PI;
  }
}

export const locationService = new LocationService();