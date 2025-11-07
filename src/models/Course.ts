import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in weeks
  price: number;
  currency: 'USD' | 'PKR';
  instructor: mongoose.Types.ObjectId;
  maxStudents: number;
  enrolledStudents: mongoose.Types.ObjectId[];
  schedule: {
    days: string[];
    time: string;
    timezone: string;
  };
  status: 'active' | 'inactive' | 'completed' | 'cancelled';
  requirements: string[];
  learningOutcomes: string[];
  materials: {
    title: string;
    type: 'pdf' | 'video' | 'audio' | 'link';
    url: string;
  }[];
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>({
  courseId: {
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
  category: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['USD', 'PKR'],
    default: 'USD'
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  maxStudents: {
    type: Number,
    required: true,
    default: 20
  },
  enrolledStudents: [{
    type: Schema.Types.ObjectId,
    ref: 'Student'
  }],
  schedule: {
    days: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    time: String,
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'cancelled'],
    default: 'active'
  },
  requirements: [String],
  learningOutcomes: [String],
  materials: [{
    title: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'audio', 'link']
    },
    url: String
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ICourse>('Course', CourseSchema);














