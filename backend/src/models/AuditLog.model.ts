import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLogDocument extends Document {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: string;
  target?: string;
  targetId?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    actorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true, trim: true },
    actorRole: { type: String, required: true },
    action:    { type: String, required: true, trim: true, uppercase: true },
    target:    { type: String, trim: true },
    targetId:  { type: Schema.Types.ObjectId },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    metadata:  { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        if ('__v' in ret) if (ret.__v !== undefined) delete ret.__v;
        if (ret._id)      ret._id      = String(ret._id);
        if (ret.actorId)  ret.actorId  = String(ret.actorId);
        if (ret.targetId) ret.targetId = String(ret.targetId);
        return ret;
      },
    },
  }
);

// Indexes for the query patterns used in the controller
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ actorRole: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);