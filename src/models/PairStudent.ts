import mongoose, { Document, Schema } from 'mongoose';

export interface IPairStudent extends Document {
  pair: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  startDate: Date;
  status: 'active' | 'on-hold' | 'completed';
  startTime: string;
  endTime: string;
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  createdAt: Date;
  updatedAt: Date;
}

const PairStudentSchema = new Schema<IPairStudent>({
  pair: {
    type: Schema.Types.ObjectId,
    ref: 'TeacherPair',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'on-hold', 'completed'],
    default: 'active'
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        // Validate time format (HH:MM)
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        // Validate time format (HH:MM)
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  days: [{
    type: String,
    enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    required: true
  }]
}, {
  timestamps: true
});

// Unique partial index: one student can only belong to one active pair at a time
PairStudentSchema.index(
  { student: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

// Index for faster queries
PairStudentSchema.index({ pair: 1 });
PairStudentSchema.index({ student: 1, status: 1 });

export default mongoose.model<IPairStudent>('PairStudent', PairStudentSchema);

