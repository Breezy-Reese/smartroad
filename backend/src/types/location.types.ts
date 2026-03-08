import { Document, Types } from 'mongoose';
import { ICoordinates } from './user.types';

/* =========================
   LOCATION INTERFACES
========================= */

/** Represents a single driver location report */
export interface ILocation {
  _id: string | Types.ObjectId;
  driverId: string | Types.ObjectId;
  driverName?: string;
  vehicleId?: string | Types.ObjectId;
  vehicleNumber?: string;
  latitude: number;
  longitude: number;
  speed: number; // in km/h or m/s - specify in comment
  accuracy: number; // in meters
  heading?: number; // degrees from north (0-359)
  altitude?: number; // in meters
  altitudeAccuracy?: number; // in meters
  timestamp: Date;
  status?: 'driving' | 'idle' | 'stopped' | 'emergency';
  createdAt?: Date; // add for auditing
  updatedAt?: Date;
}

/** Payload for updating a driver location */
export interface ILocationUpdate {
  driverId: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  speed: number; // in km/h or m/s
  accuracy: number; // in meters
  heading?: number; // degrees from north (0-359)
  altitude?: number; // in meters
  altitudeAccuracy?: number; // in meters
  timestamp: Date;
  status?: 'driving' | 'idle' | 'stopped' | 'emergency';
}

/** Query parameters for searching nearby users or vehicles */
export interface INearbyQuery {
  latitude: number;
  longitude: number;
  radius: number; // kilometers
  role?: 'driver' | 'hospital' | 'responder' | 'all';
  limit?: number; // max results to return
  excludeSelf?: boolean; // exclude the requesting user
  includeInactive?: boolean; // include inactive users
}

/** Result returned from a nearby query */
export interface INearbyResult {
  id: string;
  name: string;
  type: 'driver' | 'hospital' | 'responder' | 'vehicle'; // more specific than string
  location: ICoordinates;
  distance: number; // in kilometers
  bearing?: number; // optional heading in degrees (0-359)
  status?: string; // optional current status
  eta?: number; // estimated time of arrival in minutes
  speed?: number; // current speed if available
}

/** Represents a driver route */
export interface IRoute extends Document {
  driverId: string | Types.ObjectId;
  tripId?: string | Types.ObjectId;
  startPoint: ICoordinates;
  endPoint?: ICoordinates;
  waypoints: ICoordinates[];
  distance: number; // in meters or kilometers - SPECIFY UNIT!
  duration: number; // in seconds or minutes - SPECIFY UNIT!
  status: 'planned' | 'active' | 'completed' | 'abandoned' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  // Don't redeclare _id, createdAt, updatedAt - they come from Document
}
/** Geofence definition */
export interface IGeofence extends Document {
  _id: Types.ObjectId; // Document already has this, but you can specify the type
  name: string;
  type: 'circle' | 'polygon' | 'rectangle';
  center?: ICoordinates; // for circle
  radius?: number; // in kilometers, for circle
  points?: ICoordinates[]; // for polygon
  alertOnEntry: boolean;
  alertOnExit: boolean;
  alertOnDwell?: boolean; // alert if dwelling inside
  dwellTime?: number; // minutes to trigger dwell alert
  enabled: boolean; // whether geofence is active
  metadata?: Record<string, any>; // additional data
  createdBy?: string | Types.ObjectId;
  // createdAt and updatedAt come from Document if timestamps: true
}

/** Geofence event */
export interface IGeofenceEvent {
  geofenceId: string;
  geofenceName: string;
  driverId: string;
  vehicleId?: string;
  eventType: 'entry' | 'exit' | 'dwell';
  timestamp: Date;
  location: ICoordinates;
}

/** Location history response */
export interface ILocationHistory {
  driverId: string;
  driverName?: string;
  locations: Array<{
    latitude: number;
    longitude: number;
    speed: number;
    heading?: number;
    timestamp: Date;
  }>;
  fromDate: Date;
  toDate: Date;
  totalPoints: number;
}