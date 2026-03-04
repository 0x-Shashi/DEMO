// ===========================================
// Timetable Model - MongoDB Schema
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';

// Timetable Entry (Individual class slot)
export interface ITimetableEntry {
  day: number; // 0-5 (Monday-Saturday)
  slot: number; // Slot number in the day
  subject: mongoose.Types.ObjectId;
  faculty: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  type: 'theory' | 'practical';
}

export interface ITimetable extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  department: mongoose.Types.ObjectId;
  batch?: mongoose.Types.ObjectId;
  academicYear: string;
  semester: number;
  batches: mongoose.Types.ObjectId[];
  status: 'draft' | 'pending' | 'approved' | 'published' | 'rejected';
  entries: ITimetableEntry[];
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  comments?: string;
  rejectionReason?: string;
  optimizationScore?: number;
  hardConstraintViolations: number;
  softConstraintViolations: number;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableEntrySchema = new Schema<ITimetableEntry>(
  {
    day: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    slot: {
      type: Number,
      required: true,
      min: 0,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    faculty: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    type: {
      type: String,
      enum: ['theory', 'practical'],
      default: 'theory',
    },
  },
  { _id: false }
);

const TimetableSchema = new Schema<ITimetable>(
  {
    name: {
      type: String,
      required: [true, 'Please provide timetable name'],
      trim: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Please provide department'],
    },
    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
    },
    academicYear: {
      type: String,
      required: [true, 'Please provide academic year'],
    },
    semester: {
      type: Number,
      required: [true, 'Please provide semester'],
      min: 1,
      max: 8,
    },
    batches: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'published', 'rejected'],
      default: 'draft',
    },
    entries: [TimetableEntrySchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: {
      type: Date,
    },
    comments: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    optimizationScore: {
      type: Number,
      min: 0,
      max: 10,
    },
    hardConstraintViolations: {
      type: Number,
      default: 0,
    },
    softConstraintViolations: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TimetableSchema.index({ department: 1, academicYear: 1, semester: 1 });
TimetableSchema.index({ status: 1 });
TimetableSchema.index({ createdBy: 1 });

const Timetable: Model<ITimetable> =
  mongoose.models.Timetable ||
  mongoose.model<ITimetable>('Timetable', TimetableSchema);

export default Timetable;
