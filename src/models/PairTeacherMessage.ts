import mongoose, { Document, Schema } from 'mongoose';

export interface IPairTeacherMessage extends Document {
  pair: mongoose.Types.ObjectId;
  fromTeacher: mongoose.Types.ObjectId;
  toTeacher: mongoose.Types.ObjectId;
  student?: mongoose.Types.ObjectId; // Optional: link message to specific student
  subject: string;
  message: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PairTeacherMessageSchema = new Schema<IPairTeacherMessage>({
  pair: {
    type: Schema.Types.ObjectId,
    ref: 'TeacherPair',
    required: true
  },
  fromTeacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  toTeacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
PairTeacherMessageSchema.index({ pair: 1, createdAt: -1 });
PairTeacherMessageSchema.index({ fromTeacher: 1, toTeacher: 1, createdAt: -1 });
PairTeacherMessageSchema.index({ toTeacher: 1, read: 1, createdAt: -1 });
PairTeacherMessageSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model<IPairTeacherMessage>('PairTeacherMessage', PairTeacherMessageSchema);

