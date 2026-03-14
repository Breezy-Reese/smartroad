import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITripScoreDocument extends Document {
  driverId: Types.ObjectId;
  tripId: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  distance: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  events: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    penalty: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const TripEventSchema = new Schema(
  {
    type:      { type: String, required: true },
    severity:  { type: String, enum: ['low', 'medium', 'high'], required: true },
    timestamp: { type: Date, required: true },
    penalty:   { type: Number, required: true },
  },
  { _id: false },
);

const TripScoreSchema = new Schema<ITripScoreDocument>(
  {
    driverId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tripId:    { type: String, required: true },
    score:     { type: Number, required: true, min: 0, max: 100 },
    grade:     { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },
    distance:  { type: Number, default: 0 },
    duration:  { type: Number, default: 0 },
    startTime: { type: Date, required: true },
    endTime:   { type: Date, required: true },
    events:    { type: [TripEventSchema], default: [] },
  },
  { timestamps: true },
);

TripScoreSchema.index({ driverId: 1, createdAt: -1 });

export const TripScore = mongoose.model<ITripScoreDocument>('TripScore', TripScoreSchema);
