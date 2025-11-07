import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  studentId: string;
  fullName: string;
  email: string;
  contact: string;
  program: string;
  level: string;
  assignedTeacher: string;
  enrolledDate: Date;
  tuitionFee: number;
  paymentStatus: 'current' | 'pending' | 'overdue';
  status: 'active' | 'inactive' | 'suspended';
  parentInfo?: {
    name: string;
    contact: string;
    relationship: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  avatar: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  contact: {
    type: String,
    required: true
  },
  program: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true
  },
  assignedTeacher: {
    type: String,
    required: true
  },
  enrolledDate: {
    type: Date,
    default: Date.now
  },
  tuitionFee: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['current', 'pending', 'overdue'],
    default: 'current'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  parentInfo: {
    name: String,
    contact: String,
    relationship: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  avatar: {
    type: String,
    default: ''
  },
  notes: String
}, {
  timestamps: true
});

export default mongoose.model<IStudent>('Student', StudentSchema);














