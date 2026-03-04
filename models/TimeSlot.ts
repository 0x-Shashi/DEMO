// ===========================================
// TimeSlot Model - MongoDB Schema
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITimeSlot extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  startTime: string; // Format: "HH:mm"
  endTime: string;   // Format: "HH:mm"
  slotNumber: number; // 1, 2, 3, etc.
  type: 'theory' | 'practical' | 'break' | 'lunch';
  duration: number; // in minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    name: {
      type: String,
      required: [true, 'Please provide slot name'],
      trim: true,
    },
    startTime: {
      type: String,
      required: [true, 'Please provide start time'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide valid time format (HH:mm)'],
    },
    endTime: {
      type: String,
      required: [true, 'Please provide end time'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide valid time format (HH:mm)'],
    },
    slotNumber: {
      type: Number,
      required: [true, 'Please provide slot number'],
      min: 1,
    },
    type: {
      type: String,
      enum: ['theory', 'practical', 'break', 'lunch'],
      default: 'theory',
    },
    duration: {
      type: Number,
      required: [true, 'Please provide duration'],
      min: 15,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TimeSlotSchema.index({ slotNumber: 1 }, { unique: true });

const TimeSlot: Model<ITimeSlot> =
  mongoose.models.TimeSlot || mongoose.model<ITimeSlot>('TimeSlot', TimeSlotSchema);

export default TimeSlot;
