import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacherPair extends Document {
  name: string;
  teacher1: mongoose.Types.ObjectId;
  teacher2: mongoose.Types.ObjectId;
  program: 'Full-Time HQ' | 'Part-Time HQ' | 'After School';
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherPairSchema = new Schema<ITeacherPair>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  teacher1: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacher2: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  program: {
    type: String,
    enum: ['Full-Time HQ', 'Part-Time HQ', 'After School'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for faster queries
TeacherPairSchema.index({ teacher1: 1, teacher2: 1 });
TeacherPairSchema.index({ status: 1 });

export default mongoose.model<ITeacherPair>('TeacherPair', TeacherPairSchema);

