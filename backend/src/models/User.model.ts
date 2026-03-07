import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  IUser,
  UserRole,
  IEmergencyContact,
  IMedicalInfo,
} from '../types/user.types';

/* ============================================================
   DOCUMENT TYPE
============================================================ */

export type IUserDocument = IUser & Document;

/* ============================================================
   SUB SCHEMAS
============================================================ */

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    isPrimary: { type: Boolean, default: false },
    isNotified: { type: Boolean, default: false },
  },
  { _id: true }
);

const MedicalInfoSchema = new Schema<IMedicalInfo>(
  {
    bloodGroup: String,
    allergies: [String],
    medicalConditions: [String],
    medications: [String],
    emergencyNotes: String,
    organDonor: { type: Boolean, default: false },
  },
  { _id: false }
);

/* ============================================================
   MAIN USER SCHEMA
============================================================ */

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ['driver', 'hospital', 'admin', 'responder'],
      default: 'driver',
    },

    phone: {
      type: String,
      required: true,
    },

    profileImage: {
      type: String,
      default: 'default-avatar.png',
    },

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLogin: Date,

    refreshToken: {
      type: String,
      select: false,
    },

    /* ================= DRIVER FIELDS ================= */

    licenseNumber: {
      type: String,
      required: function (this: IUserDocument) {
        return this.role === 'driver';
      },
    },

    licenseExpiry: {
      type: Date,
      required: function (this: IUserDocument) {
        return this.role === 'driver';
      },
    },

    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },

    emergencyContacts: {
      type: [EmergencyContactSchema],
      default: [],
    },

    medicalInfo: {
      type: MedicalInfoSchema,
      default: {},
    },

    drivingExperience: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    totalTrips: { type: Number, default: 0 },

    /* ================= HOSPITAL FIELDS ================= */

    hospitalName: {
      type: String,
      required: function (this: IUserDocument) {
        return this.role === 'hospital';
      },
    },

    registrationNumber: {
      type: String,
      required: function (this: IUserDocument) {
        return this.role === 'hospital';
      },
    },

    address: {
      type: String,
      required: function (this: IUserDocument) {
        return this.role === 'hospital';
      },
    },

    location: {
      lat: Number,
      lng: Number,
    },

    contactNumber: {
      type: String,
      required: function (this: IUserDocument) {
        return this.role === 'hospital';
      },
    },

    emergencyContact: {
      type: String,
      required: function (this: IUserDocument) {
        return this.role === 'hospital';
      },
    },

    capacity: {
      beds: { type: Number, default: 0 },
      ambulances: { type: Number, default: 0 },
      responders: { type: Number, default: 0 },
    },

    services: {
      type: [String],
      default: [],
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    /* ================= RESPONDER FIELDS ================= */

    responderType: {
      type: String,
      enum: ['ambulance', 'paramedic', 'doctor', 'rescue'],
      required: function (this: IUserDocument) {
        return this.role === 'responder';
      },
    },

    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function (this: IUserDocument) {
        return this.role === 'responder';
      },
    },

    currentLocation: {
      lat: Number,
      lng: Number,
    },

    currentIncidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
    },

    certifications: { type: [String], default: [] },
    experience: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* ============================================================
   PASSWORD HASH
============================================================ */

UserSchema.pre('save', async function (next) {
  const user = this as IUserDocument;

  if (!user.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err as any);
  }
});

/* ============================================================
   PASSWORD CHECK
============================================================ */

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ============================================================
   INDEXES
============================================================ */

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ hospitalId: 1 });
UserSchema.index({ 'location.lat': 1, 'location.lng': 1 });

export const User = mongoose.model<IUserDocument>('User', UserSchema);