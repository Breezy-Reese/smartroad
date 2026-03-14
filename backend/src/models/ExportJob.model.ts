import mongoose, { Schema, Document, Types } from 'mongoose';

export type ExportJobType   = 'incidents' | 'audit_log' | 'driver_scores' | 'notifications' | 'users' | 'trips';
export type ExportJobFormat = 'csv' | 'pdf';
export type ExportJobStatus = 'queued' | 'processing' | 'ready' | 'failed';

export interface IExportJobDocument extends Document {
  _id: Types.ObjectId;
  requestedBy: Types.ObjectId;
  requestedByEmail: string;
  type: ExportJobType;
  format: ExportJobFormat;
  status: ExportJobStatus;
  downloadUrl?: string;
  filePath?: string;
  filters: Record<string, any>;
  errorMessage?: string;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExportJobSchema = new Schema<IExportJobDocument>(
  {
    requestedBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByEmail: { type: String, required: true, trim: true },
    type:   { type: String, enum: ['incidents', 'audit_log', 'driver_scores', 'notifications', 'users', 'trips'], required: true },
    format: { type: String, enum: ['csv', 'pdf'], required: true },
    status: { type: String, enum: ['queued', 'processing', 'ready', 'failed'], default: 'queued' },
    downloadUrl:  { type: String },
    filePath:     { type: String },
    filters:      { type: Schema.Types.Mixed, default: {} },
    errorMessage: { type: String },
    completedAt:  { type: Date },
    // Auto-expire download links after 7 days
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  },
  {
    timestamps: true,
    toJSON: {
  transform: (_doc, ret: Record<string, any>) => {
    if ('__v' in ret) delete ret.__v;
    if (ret._id)         ret._id         = String(ret._id);
    if (ret.requestedBy) ret.requestedBy = String(ret.requestedBy);
    delete ret.filePath;
    return ret;
  },
}
  }
);

ExportJobSchema.index({ requestedBy: 1, createdAt: -1 });
ExportJobSchema.index({ status: 1 });
// TTL index: MongoDB will delete documents 0 seconds after expiresAt
ExportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ExportJob = mongoose.model<IExportJobDocument>('ExportJob', ExportJobSchema);