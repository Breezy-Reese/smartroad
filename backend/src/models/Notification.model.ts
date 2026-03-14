import mongoose, { Schema, Document, Types } from 'mongoose';

/* ── Notification Preferences ── */
export interface INotificationPrefsDocument extends Document {
  driverId: Types.ObjectId;
  pushEnabled: boolean;
  smsEnabled: boolean;
  smsPhoneNumber: string;
  emailEnabled: boolean;
  emailAddress: string;
  smsFallbackOnPushFail: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const NotificationPrefsSchema = new Schema<INotificationPrefsDocument>(
  {
    driverId:              { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pushEnabled:           { type: Boolean, default: true },
    smsEnabled:            { type: Boolean, default: true },
    smsPhoneNumber:        { type: String, default: '' },
    emailEnabled:          { type: Boolean, default: false },
    emailAddress:          { type: String, default: '' },
    smsFallbackOnPushFail: { type: Boolean, default: true },
    quietHoursEnabled:     { type: Boolean, default: false },
    quietHoursStart:       { type: String, default: '22:00' },
    quietHoursEnd:         { type: String, default: '07:00' },
  },
  { timestamps: true },
);

export const NotificationPrefs = mongoose.model<INotificationPrefsDocument>(
  'NotificationPrefs',
  NotificationPrefsSchema,
);

/* ── Escalation Policy ── */
export interface IEscalationPolicyDocument extends Document {
  driverId: Types.ObjectId;
  name: string;
  steps: {
    level: 1 | 2 | 3;
    delaySeconds: number;
    recipients: string[];
    channels: string[];
  }[];
}

const EscalationStepSchema = new Schema(
  {
    level:        { type: Number, enum: [1, 2, 3], required: true },
    delaySeconds: { type: Number, default: 0 },
    recipients:   { type: [String], default: [] },
    channels:     { type: [String], default: [] },
  },
  { _id: false },
);

const EscalationPolicySchema = new Schema<IEscalationPolicyDocument>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name:     { type: String, default: 'Standard escalation' },
    steps:    { type: [EscalationStepSchema], default: [] },
  },
  { timestamps: true },
);

export const EscalationPolicy = mongoose.model<IEscalationPolicyDocument>(
  'EscalationPolicy',
  EscalationPolicySchema,
);

/* ── Delivery Receipt ── */
export interface IDeliveryReceiptDocument extends Document {
  incidentId: Types.ObjectId;
  driverId: Types.ObjectId;
  recipientId: string;
  recipientName: string;
  channel: 'push' | 'sms' | 'call' | 'email';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
}

const DeliveryReceiptSchema = new Schema<IDeliveryReceiptDocument>(
  {
    incidentId:    { type: Schema.Types.ObjectId, ref: 'Incident', required: true },
    driverId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId:   { type: String, required: true },
    recipientName: { type: String, required: true },
    channel:       { type: String, enum: ['push', 'sms', 'call', 'email'], required: true },
    status:        { type: String, enum: ['pending', 'sent', 'delivered', 'failed', 'read'], default: 'pending' },
    sentAt:        { type: Date },
    deliveredAt:   { type: Date },
    failureReason: { type: String },
    retryCount:    { type: Number, default: 0 },
  },
  { timestamps: true },
);

DeliveryReceiptSchema.index({ driverId: 1, createdAt: -1 });
DeliveryReceiptSchema.index({ incidentId: 1 });

export const DeliveryReceipt = mongoose.model<IDeliveryReceiptDocument>(
  'DeliveryReceipt',
  DeliveryReceiptSchema,
);
