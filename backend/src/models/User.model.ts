import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import {  
  IEmergencyContact, 
  IMedicalInfo, 
  ICoordinates,
  UserRole 
} from '../types/user.types';

/* ============================================================
   TYPES
============================================================ */
export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  profileImage?: string;
  isActive?: boolean;
  isVerified?: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
  emergencyContacts?: IEmergencyContact[];
  medicalInfo?: IMedicalInfo;
  licenseNumber?: string;
  licenseExpiry?: Date;
  vehicleId?: Types.ObjectId;
  vehicleNumber?: string;
  hospitalName?: string;
  registrationNumber?: string;
  address?: string;
  location?: ICoordinates;
  contactNumber?: string;
  emergencyContact?: string;
  responderType?: 'ambulance' | 'police' | 'fire' | 'rescue';
  hospitalId?: Types.ObjectId;
  currentLocation?: ICoordinates;
  currentIncidentId?: Types.ObjectId;
  certifications?: string[];
  experience?: number;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/* ============================================================
   SUB SCHEMAS
============================================================ */
const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      trim: true, 
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    isPrimary: { type: Boolean, default: false },
    isNotified: { type: Boolean, default: false },
    notifiedAt: { type: Date }
  },
  { _id: true, timestamps: true }
);

const MedicalInfoSchema = new Schema<IMedicalInfo>(
  {
    bloodGroup: { 
      type: String, 
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], 
    },
    allergies: { type: [String], default: [] },
    medicalConditions: { type: [String], default: [] },
    medications: { type: [String], default: [] },
    emergencyNotes: { type: String, trim: true },
    organDonor: { type: Boolean, default: false },
  },
  { _id: false }
);

const CoordinatesSchema = new Schema<ICoordinates>(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 }
  },
  { _id: false }
);

/* ============================================================
   MAIN USER SCHEMA
============================================================ */
const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { 
      type: String, 
      required: [true, 'Email is required'], 
      unique: true,  // This creates an index automatically
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: { 
      type: String, 
      required: [true, 'Password is required'], 
      select: false,
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: { 
      type: String, 
      enum: {
        values: ['driver', 'hospital', 'admin', 'responder'] as UserRole[],
        message: '{VALUE} is not a valid role'
      }, 
      required: true,
      default: 'driver' 
    },
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[\d\s-]{10,}$/, 'Please provide a valid phone number']
    },
    profileImage: { 
      type: String, 
      default: 'default-avatar.png' 
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    refreshToken: { type: String, select: false },
    emailVerificationToken: { type: String, select: false },
    
    // Password reset fields
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Emergency and medical info
    emergencyContacts: { type: [EmergencyContactSchema], default: [] },
    medicalInfo: { type: MedicalInfoSchema, default: {} },

    // Driver fields
    licenseNumber: { 
      type: String, 
      trim: true,
      sparse: true,
      unique: true,  // This creates an index automatically
      match: [/^[A-Z0-9-]+$/, 'Invalid license number format']
    },
    licenseExpiry: { type: Date },
    vehicleId: { type: Types.ObjectId, ref: 'Vehicle' },
    vehicleNumber: { type: String, trim: true },

    // Hospital fields
    hospitalName: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    location: { type: CoordinatesSchema },
    contactNumber: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },

    // Responder fields
    responderType: { 
      type: String, 
      enum: {
        values: ['ambulance', 'police', 'fire', 'rescue'],
        message: '{VALUE} is not a valid responder type'
      } 
    },
    hospitalId: { type: Types.ObjectId, ref: 'User' },
    currentLocation: { type: CoordinatesSchema },
    currentIncidentId: { type: Types.ObjectId, ref: 'Incident' },
    certifications: { type: [String], default: [] },
    experience: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: IUserDocument, ret: Record<string, any>) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.emailVerificationToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        
        if (ret._id) ret._id = ret._id.toString();
        if (ret.vehicleId) ret.vehicleId = ret.vehicleId.toString();
        if (ret.hospitalId) ret.hospitalId = ret.hospitalId.toString();
        if (ret.currentIncidentId) ret.currentIncidentId = ret.currentIncidentId.toString();
        
        return ret;
      },
    },
  }
);

/* ============================================================
   INDEXES
============================================================ */
// Compound index for role + active status
UserSchema.index({ role: 1, isActive: 1 });

// REMOVED: Duplicate email index (already created by unique:true in schema)
// UserSchema.index({ email: 1 }, { unique: true, background: true });

UserSchema.index({ phone: 1 }, { 
  background: true 
});

// REMOVED: Duplicate licenseNumber index (already created by unique:true in schema)
// UserSchema.index({ licenseNumber: 1 }, { sparse: true, unique: true, background: true });

// Geospatial indexes for location queries
UserSchema.index({ 
  "location.lat": 1, 
  "location.lng": 1 
}, { 
  background: true 
});

UserSchema.index({ 
  "currentLocation.lat": 1, 
  "currentLocation.lng": 1 
}, { 
  background: true 
});

// Compound index for hospital queries
UserSchema.index({ 
  hospitalId: 1, 
  role: 1 
}, { 
  background: true 
});

// Sort index for createdAt
UserSchema.index({ createdAt: -1 }, { 
  background: true 
});

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
    next(err as Error);
  }
});

/* ============================================================
   VIRTUAL PROPERTIES
============================================================ */
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

/* ============================================================
   INSTANCE METHODS
============================================================ */
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to get public profile
UserSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.__v;
  return userObject;
};

/* ============================================================
   STATIC METHODS
============================================================ */
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveDrivers = function() {
  return this.find({ role: 'driver', isActive: true });
};

/* ============================================================
   MODEL EXPORT
============================================================ */
interface UserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findActiveDrivers(): Promise<IUserDocument[]>;
}

export const User = mongoose.model<IUserDocument, UserModel>('User', UserSchema);