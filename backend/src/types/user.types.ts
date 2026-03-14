export type UserRole = 'driver' | 'hospital' | 'admin' | 'responder';

export interface ICoordinates {
  lat: number;
  lng: number;
}

// user.types.ts
export interface IEmergencyContact {
  _id?: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
  isNotified?: boolean;
  notifiedAt?: Date;  // Add this field
}

// ================================================================
// PATCH — src/types/user.types.ts
// Find IMedicalInfo and replace it with this:
// ================================================================

export interface IMedicalInfo {
  bloodGroup?: string;
  allergies?: string[];
  medicalConditions?: string[];
  medications?: string[];
  emergencyNotes?: string;
  organDonor?: boolean;
  doctorName?: string;    // ADD
  doctorPhone?: string;   // ADD
}

// ================================================================
// PATCH — src/models/User.model.ts
// Find MedicalInfoSchema and add these two fields inside it:
//
//   doctorName:  { type: String, trim: true, default: '' },
//   doctorPhone: { type: String, trim: true, default: '' },
//
// ================================================================

// ================================================================
// PATCH — src/routes/user.routes.ts
// Find medicalInfoValidation and add these two rules:
//
//   body('doctorName')
//     .optional()
//     .isString().withMessage('Doctor name must be a string')
//     .trim(),
//   body('doctorPhone')
//     .optional()
//     .matches(/^\+?[\d\s-]{10,}$/).withMessage('Invalid phone number')
//     .trim(),
//
// ================================================================




export interface IUser {
  _id?: string;
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
  vehicleId?: string;
  vehicleNumber?: string;  // ← ADD THIS LINE (for vehicle plate number)

  hospitalName?: string;
  registrationNumber?: string;
  address?: string;
  location?: ICoordinates;

  contactNumber?: string;
  emergencyContact?: string;

  responderType?: 'ambulance' | 'police' | 'fire' | 'rescue';
  hospitalId?: string;

  currentLocation?: ICoordinates;
  currentIncidentId?: string;

  certifications?: string[];
  experience?: number;

  emailVerificationToken?: string;
  passwordResetToken?: string;      // ← ADD THIS LINE (for password reset)
  passwordResetExpires?: Date;      // ← ADD THIS LINE (for password reset expiry)
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;

  licenseNumber?: string;
  hospitalName?: string;
}
// ================================================================
// PATCH — src/types/user.types.ts
// Add this interface:
// ================================================================

export interface IDriverPreferences {
  language: string;
  distanceUnit: 'km' | 'miles';
  speedUnit: 'km/h' | 'mph';
  notificationsEnabled: boolean;
  soundAlerts: boolean;
  vibrationAlerts: boolean;
  autoStartTrip: boolean;
  shareLocationWithFleet: boolean;
  darkMode: 'auto' | 'light' | 'dark';
  emergencyCountdownSeconds: number;
}

// Then add to IUser:
//   preferences?: IDriverPreferences;

// ================================================================
// PATCH — src/models/User.model.ts
// Add this sub-schema before UserSchema:
//
// const DriverPreferencesSchema = new Schema<IDriverPreferences>(
//   {
//     language:                   { type: String, default: 'en' },
//     distanceUnit:               { type: String, enum: ['km', 'miles'], default: 'km' },
//     speedUnit:                  { type: String, enum: ['km/h', 'mph'], default: 'km/h' },
//     notificationsEnabled:       { type: Boolean, default: true },
//     soundAlerts:                { type: Boolean, default: true },
//     vibrationAlerts:            { type: Boolean, default: true },
//     autoStartTrip:              { type: Boolean, default: false },
//     shareLocationWithFleet:     { type: Boolean, default: true },
//     darkMode:                   { type: String, enum: ['auto', 'light', 'dark'], default: 'auto' },
//     emergencyCountdownSeconds:  { type: Number, default: 10, min: 5, max: 30 },
//   },
//   { _id: false },
// );
//
// Then add to UserSchema fields:
//   preferences: { type: DriverPreferencesSchema, default: {} },
// ================================================================

export {};
