export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationData {
  lat: number;
  lng: number;
  speed: number;
  accuracy: number;
  heading?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  timestamp: Date;
}

export interface DriverLocation extends LocationData {
  driverId: string;
  driverName?: string;
  vehicleNumber?: string;
  status?: 'driving' | 'idle' | 'stopped' | 'emergency';
}

export interface HospitalLocation {
  hospitalId: string;
  hospitalName: string;
  location: Coordinates;
  address: string;
  contactNumber: string;
  availableBeds: number;
  availableAmbulances: number;
}

export interface ResponderLocation {
  responderId: string;
  responderName: string;
  type: string;
  location: Coordinates;
  status: 'available' | 'en-route' | 'busy' | 'offline';
  destination?: Coordinates;
  eta?: number;
}

export interface Geofence {
  _id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: Coordinates;
  radius?: number;
  points?: Coordinates[];
  alertOnEntry: boolean;
  alertOnExit: boolean;
}

export interface Route {
  _id: string;
  driverId: string;
  tripId?: string;
  startPoint: Coordinates;
  endPoint?: Coordinates;
  waypoints: Coordinates[];
  distance: number;
  duration: number;
  status: 'planned' | 'active' | 'completed' | 'abandoned';
  startedAt?: Date;
  completedAt?: Date;
}