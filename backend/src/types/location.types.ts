import { Document } from 'mongoose';
import { ICoordinates } from './user.types';

export interface ILocation extends Document {
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

export interface INearbyQuery {
  latitude: number;
  longitude: number;
  radius: number; // in kilometers
  role?: 'driver' | 'hospital' | 'responder';
}

export interface INearbyResult {
  id: string;
  name: string;
  type: string;
  location: ICoordinates;
  distance: number;
  bearing?: number;
  status?: string;
}

export interface IRoute extends Document {
  _id: string;
  driverId: string;
  tripId?: string;
  startPoint: ICoordinates;
  endPoint?: ICoordinates;
  waypoints: ICoordinates[];
  distance: number;
  duration: number;
  status: 'planned' | 'active' | 'completed' | 'abandoned';
  startedAt?: Date;
  completedAt?: Date;
}

export interface IGeofence extends Document {
  _id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: ICoordinates;
  radius?: number;
  points?: ICoordinates[];
  alertOnEntry: boolean;
  alertOnExit: boolean;
}