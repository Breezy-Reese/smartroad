import { Document } from 'mongoose';
import { ICoordinates } from './user.types';

/* =========================
   LOCATION INTERFACES
========================= */

/** Represents a single driver location report */
export interface ILocation {
  _id: string;
  driverId: string;
  driverName?: string;
  vehicleId?: string;
  vehicleNumber?: string;
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  heading?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  timestamp: Date;
  status?: 'driving' | 'idle' | 'stopped' | 'emergency';
}

/** Payload for updating a driver location */
export interface ILocationUpdate {
  driverId: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  heading?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  timestamp: Date;
  status?: 'driving' | 'idle' | 'stopped' | 'emergency';
}

/** Query parameters for searching nearby users or vehicles */
export interface INearbyQuery {
  latitude: number;
  longitude: number;
  radius: number; // kilometers
  role?: 'driver' | 'hospital' | 'responder';
}

/** Result returned from a nearby query */
export interface INearbyResult {
  id: string;
  name: string;
  type: string; // driver, hospital, responder, etc.
  location: ICoordinates;
  distance: number; // in kilometers
  bearing?: number; // optional heading in degrees
  status?: string; // optional current status
}

/** Represents a driver route */
export interface IRoute extends Document {
  _id: string;
  driverId: string;
  tripId?: string;
  startPoint: ICoordinates;
  endPoint?: ICoordinates;
  waypoints: ICoordinates[];
  distance: number; // in meters or kilometers
  duration: number; // in seconds or minutes
  status: 'planned' | 'active' | 'completed' | 'abandoned';
  startedAt?: Date;
  completedAt?: Date;
}

/** Geofence definition */
export interface IGeofence extends Document {
  _id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: ICoordinates; // for circle
  radius?: number; // in kilometers, for circle
  points?: ICoordinates[]; // for polygon
  alertOnEntry: boolean;
  alertOnExit: boolean;
}