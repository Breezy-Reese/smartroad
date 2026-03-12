/* ================= COORDINATES ================= */
export interface Coordinates {
  lat: number;        // required
  lng: number;        // required
  latitude?: number;  // optional backend alias
  longitude?: number; // optional backend alias
}

/* ================= LOCATION DATA ================= */
export interface LocationData {
  lat: number;
  lng: number;
  speed: number;
  accuracy: number;
  heading?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  timestamp: Date | string;
}

/* ================= DRIVER LOCATION ================= */
export interface DriverLocation extends LocationData {
  driverId: string;
  driverName?: string;
  vehicleNumber?: string;
  status?: 'driving' | 'idle' | 'stopped' | 'emergency';
}

/* ================= HOSPITAL LOCATION ================= */
export interface HospitalLocation {
  hospitalId: string;
  hospitalName: string;
  location: Coordinates;
  address: string;
  contactNumber: string;
  availableBeds: number;
  availableAmbulances: number;
}

/* ================= RESPONDER LOCATION ================= */
export interface ResponderLocation {
  responderId: string;
  responderName: string;
  type: string;
  location: Coordinates;
  status: 'available' | 'en-route' | 'busy' | 'offline';
  destination?: Coordinates;
  eta?: number; // in minutes
}

/* ================= GEOFENCE ================= */
export interface Geofence {
  _id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: Coordinates;
  radius?: number; // in meters
  points?: Coordinates[];
  alertOnEntry: boolean;
  alertOnExit: boolean;
}

/* ================= ROUTE ================= */
export interface Route {
  _id: string;
  driverId: string;
  tripId?: string;
  startPoint: Coordinates;
  endPoint?: Coordinates;
  waypoints: Coordinates[];
  distance: number; // km
  duration: number; // minutes
  status: 'planned' | 'active' | 'completed' | 'abandoned';
  startedAt?: Date | string;
  completedAt?: Date | string;
}

/* ================= TRIP ================= */
export interface Trip {
  _id: string;
  driverId: string;
  startPoint: Coordinates;
  endPoint?: Coordinates;
  distance?: number; // km
  duration?: number; // minutes
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt?: Date | string;
  completedAt?: Date | string;
  waypoints?: Coordinates[];
  startedAt?: Date | string;
}

/* ================= HELPER ================= */
// Accepts both Coordinates (lat/lng) and Location (latitude/longitude) shapes
export function normalizeCoordinates(raw: any): Coordinates {
  const lat = raw?.lat ?? raw?.latitude;
  const lng = raw?.lng ?? raw?.longitude;

  if (lat === undefined || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
    throw new Error(`Invalid coordinates: ${JSON.stringify(raw)}`);
  }

  return { lat: Number(lat), lng: Number(lng) };
}
