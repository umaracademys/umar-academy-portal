import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
  assignmentId: string;
  title: string;
  description: string;
  course: mongoose.Types.ObjectId;
  instructor: mongoose.Types.ObjectId;
  dueDate: Date;
  maxPoints: number;
  type: 'homework' | 'quiz' | 'exam' | 'project' | 'presentation';
  instructions: string;
  attachments: {
    name: string;
    url: string;
    type: string;
  }[];
  submissions: {
    student: mongoose.Types.ObjectId;
    submittedAt: Date;
    content: string;
    attachments: {
      name: string;
      url: string;
      type: string;
    }[];
    grade?: number;
    feedback?: string;
    status: 'submitted' | 'graded' | 'late';
  }[];
  status: 'draft' | 'published' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>({
  assignmentId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  maxPoints: {
    type: Number,
    required: true,
    default: 100
  },
  type: {
    type: String,
    enum: ['homework', 'quiz', 'exam', 'project', 'presentation'],
    required: true
  },
  instructions: {
    type: String,
    required: true
  },
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  submissions: [{
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    content: String,
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    grade: {
      type: Number,
      min: 0
    },
    feedback: String,
    status: {
      type: String,
      enum: ['submitted', 'graded', 'late'],
      default: 'submitted'
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'draft'
  }
}, {
  timestamps: true
});

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);














