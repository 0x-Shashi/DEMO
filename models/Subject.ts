// ===========================================
// Subject Model - MongoDB Schema
// ===========================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  department: mongoose.Types.ObjectId;
  credits: number;
  type: 'theory' | 'practical' | 'both' | 'lab' | 'project';
  theoryHoursPerWeek: number;
  practicalHoursPerWeek: number;
  lecturesPerWeek: number;
  semester: number;
  assignedFaculty?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, 'Please provide subject name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Please provide subject code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Please provide department'],
    },
    credits: {
      type: Number,
      required: [true, 'Please provide credits'],
      min: [1, 'Credits must be at least 1'],
      max: [10, 'Credits cannot exceed 10'],
    },
    type: {
      type: String,
      enum: ['theory', 'practical', 'both', 'lab', 'project'],
      default: 'theory',
    },
    theoryHoursPerWeek: {
      type: Number,
      default: 0,
      min: 0,
    },
    practicalHoursPerWeek: {
      type: Number,
      default: 0,
      min: 0,
    },
    lecturesPerWeek: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },
    semester: {
      type: Number,
      required: [true, 'Please provide semester'],
      min: 1,
      max: 8,
    },
    assignedFaculty: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// Indexes (code already has unique index from schema)
SubjectSchema.index({ department: 1 });
SubjectSchema.index({ semester: 1 });

const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

export default Subject;
