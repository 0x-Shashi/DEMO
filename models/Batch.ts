// ===========================================
// Batch Model - MongoDB Schema (Student Groups)
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBatch extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  department: mongoose.Types.ObjectId;
  year: number;
  semester: number;
  division: string;
  studentCount: number;
  academicYear: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    name: {
      type: String,
      required: [true, 'Please provide batch name'],
      trim: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Please provide department'],
    },
    year: {
      type: Number,
      required: [true, 'Please provide year'],
      min: 1,
      max: 4,
    },
    semester: {
      type: Number,
      required: [true, 'Please provide semester'],
      min: 1,
      max: 8,
    },
    division: {
      type: String,
      required: [true, 'Please provide division'],
      trim: true,
    },
    studentCount: {
      type: Number,
      required: [true, 'Please provide student count'],
      min: 1,
    },
    academicYear: {
      type: String,
      required: [true, 'Please provide academic year'],
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
BatchSchema.index({ department: 1, year: 1, semester: 1 });
BatchSchema.index({ academicYear: 1 });

const Batch: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);

export default Batch;
