import mongoose, { Schema, Document, Types, Model } from 'mongoose';

/* ============================================================
   TYPES
============================================================ */

export type ResponderStatusType =
  | 'available'
  | 'en-route'
  | 'on-scene'
  | 'transporting'
  | 'off-duty';

export interface IGeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IResponderStatus extends Document {
  responderId: Types.ObjectId;
  isAvailable: boolean;
  currentLocation: IGeoLocation;
  currentIncidentId?: Types.ObjectId;
  status: ResponderStatusType;
  lastUpdate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   GEO LOCATION SCHEMA
============================================================ */

const GeoLocationSchema = new Schema<IGeoLocation>(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value: number[]) {
          return value.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

/* ============================================================
   RESPONDER STATUS SCHEMA
============================================================ */

const ResponderStatusSchema = new Schema<IResponderStatus>(
  {
    responderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    currentLocation: {
      type: GeoLocationSchema,
      required: true,
    },

    currentIncidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },

    status: {
      type: String,
      enum: [
        'available',
        'en-route',
        'on-scene',
        'transporting',
        'off-duty',
      ],
      default: 'available',
      index: true,
    },

    lastUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
   INDEXES
============================================================ */

// Required for location-based queries
ResponderStatusSchema.index({ currentLocation: '2dsphere' });

// Performance indexes
ResponderStatusSchema.index({ status: 1 });
ResponderStatusSchema.index({ isAvailable: 1 });

/* ============================================================
   MODEL
============================================================ */

export const ResponderStatus: Model<IResponderStatus> =
  mongoose.model<IResponderStatus>(
    'ResponderStatus',
    ResponderStatusSchema
  );
