import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, UserRole, IEmergencyContact, IMedicalInfo } from '../types/user.types';

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  isPrimary: { type: Boolean, default: false },
  isNotified: { type: Boolean, default: false },
});

const MedicalInfoSchema = new Schema<IMedicalInfo>({
  bloodGroup: { type: String },
  allergies: [{ type: String }],
  medicalConditions: [{ type: String }],
  medications: [{ type: String }],
  emergencyNotes: { type: String },
  organDonor: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: ['driver', 'hospital', 'admin', 'responder'],
      default: 'driver',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'],
    },
    profileImage: {
      type: String,
      default: 'default-avatar.png',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },

    // Driver specific fields
    licenseNumber: {
      type: String,
      required: function(this: IUserDocument) {
        return this.role === 'driver';
      },
    },
    licenseExpiry: {
      type: Date,
      required: function(this: IUserDocument) {
        return this.role === 'driver';
      },
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    emergencyContacts: [EmergencyContactSchema],
    medicalInfo: MedicalInfoSchema,
    drivingExperience: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },

    // Hospital specific fields
    hospitalName: {
      type: String,
      required: function(this: IUserDocument) {
        return this.role === 'hospital';
      },
    },
    registrationNumber: {
      type: String,
      required: function(this: IUserDocument) {
        return this.role === 'hospital';
      },
    },
    address: {
      type: String,
      required: function(this: IUserDocument) {
        return this.role === 'hospital';
      },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    contactNumber: {
      type: String,
      required: function(this: IUserDocument) {
        return this.role === 'hospital';
      },
    },
    emergencyContact: {
      type: String,
      required: function(this: IUserDocument) {
        return this.role === 'hospital';
      },
    },
    capacity: {
      beds: { type: Number, default: 0 },
      ambulances: { type: Number, default: 0 },
      responders: { type: Number, default: 0 },
    },
    services: [{ type: String }],
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Responder specific fields
    responderType: {
      type: String,
      enum: ['ambulance', 'paramedic', 'doctor', 'rescue'],
      required: function(this: IUserDocument) {
        return this.role === 'responder';
      },
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function(this: IUserDocument) {
        return this.role === 'responder';
      },
    },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    currentIncidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
    },
    certifications: [{ type: String }],
    experience: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'location.lat': 1, 'location.lng': 1 });
UserSchema.index({ hospitalId: 1 });
UserSchema.index({ isAvailable: 1 });

export const User = mongoose.model<IUserDocument>('User', UserSchema);