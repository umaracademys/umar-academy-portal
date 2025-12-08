import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacherStudentMessage extends Document {
  fromTeacher?: mongoose.Types.ObjectId; // Optional: null if from student
  toStudent?: mongoose.Types.ObjectId; // Optional: null if to teacher
  fromStudent?: mongoose.Types.ObjectId; // Optional: null if from teacher
  toTeacher?: mongoose.Types.ObjectId; // Optional: null if to student
  message: string;
  attachments?: {
    filename: string;
    url: string;
    mimetype: string;
    size: number;
  }[];
  read: boolean;
  readAt?: Date;
  adminInitiated: boolean; // True if admin sent the message
  adminId?: mongoose.Types.ObjectId; // Admin who initiated (if adminInitiated is true)
  createdAt: Date;
  updatedAt: Date;
}

const TeacherStudentMessageSchema = new Schema<ITeacherStudentMessage>({
  fromTeacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null,
    required: false
  },
  toStudent: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
    required: false
  },
  fromStudent: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
    required: false
  },
  toTeacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null,
    required: false
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true }
  }],
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  adminInitiated: {
    type: Boolean,
    default: false
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
TeacherStudentMessageSchema.index({ fromTeacher: 1, toStudent: 1, createdAt: -1 });
TeacherStudentMessageSchema.index({ fromStudent: 1, toTeacher: 1, createdAt: -1 });
TeacherStudentMessageSchema.index({ toStudent: 1, read: 1, createdAt: -1 });
TeacherStudentMessageSchema.index({ toTeacher: 1, read: 1, createdAt: -1 });
TeacherStudentMessageSchema.index({ adminInitiated: 1, createdAt: -1 });

export default mongoose.model<ITeacherStudentMessage>('TeacherStudentMessage', TeacherStudentMessageSchema);

