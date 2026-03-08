import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, IEmergencyContact, IMedicalInfo } from '../types/user.types';

/* ============================================================
   TYPES
============================================================ */
export interface IUserDocument extends IUser, Document<Types.ObjectId> {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

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
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['driver', 'hospital', 'admin', 'responder'], default: 'driver' },
    phone: { type: String, required: true },
    profileImage: { type: String, default: 'default-avatar.png' },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLogin: Date,
    refreshToken: { type: String, select: false },

    /* ================= DRIVER FIELDS ================= */
    licenseNumber: { type: String },
    licenseExpiry: { type: Date },
    vehicleId: { type: Types.ObjectId, ref: 'Vehicle' },
    emergencyContacts: { type: [EmergencyContactSchema], default: [] },
    medicalInfo: { type: MedicalInfoSchema, default: {} },
    drivingExperience: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    totalTrips: { type: Number, default: 0 },

    /* ================= HOSPITAL FIELDS ================= */
    hospitalName: { type: String },
    registrationNumber: { type: String },
    address: { type: String },
    location: { lat: Number, lng: Number },
    contactNumber: { type: String },
    emergencyContact: { type: String },
    capacity: {
      beds: { type: Number, default: 0 },
      ambulances: { type: Number, default: 0 },
      responders: { type: Number, default: 0 },
    },
    services: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },

    /* ================= RESPONDER FIELDS ================= */
    responderType: { type: String, enum: ['ambulance', 'paramedic', 'doctor', 'rescue'] },
    hospitalId: { type: Types.ObjectId, ref: 'User' },
    currentLocation: { lat: Number, lng: Number },
    currentIncidentId: { type: Types.ObjectId, ref: 'Incident' },
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
   PASSWORD HASHING
============================================================ */
UserSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as any);
  }
});

/* ============================================================
   INSTANCE METHODS
============================================================ */
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ============================================================
   MODEL EXPORT
============================================================ */
export const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', UserSchema);