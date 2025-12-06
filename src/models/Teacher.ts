import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacher extends Document {
  userId: mongoose.Types.ObjectId;
  teacherId: string;
  fullName: string;
  email: string;
  contact: string;
  department: string;
  specialization: string[];
  location: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  status: 'active' | 'inactive' | 'on-leave' | 'probation' | 'suspended';
  assignedStudents: string[];
  payroll: {
    monthlySalary: number;
    currency: 'USD' | 'PKR';
    paymentType: 'monthly' | 'weekly' | 'hourly' | 'per-student';
    bankAccount?: string;
  };
  schedule: {
    workingDays: string[];
    workingHours: {
      start: string;
      end: string;
    };
    timezone: string;
  };
  qualifications: {
    degree: string;
    institution: string;
    year: number;
    certifications?: string[];
  }[];
  experience: {
    years: number;
    previousInstitutions?: string[];
  };
  performance: {
    rating: number;
    totalStudents: number;
    completionRate: number;
    attendanceRate: number;
  };
  avatar: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherId: {
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
  department: {
    type: String,
    required: true
  },
  specialization: [{
    type: String
  }],
  location: {
    type: String,
    required: true
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave', 'probation', 'suspended'],
    default: 'active'
  },
  assignedStudents: [{
    type: String
  }],
  payroll: {
    monthlySalary: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      enum: ['USD', 'PKR'],
      default: 'USD'
    },
    paymentType: {
      type: String,
      enum: ['monthly', 'weekly', 'hourly', 'per-student'],
      default: 'monthly'
    },
    bankAccount: String
  },
  schedule: {
    workingDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    workingHours: {
      start: String,
      end: String
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    certifications: [String]
  }],
  experience: {
    years: {
      type: Number,
      default: 0
    },
    previousInstitutions: [String]
  },
  performance: {
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalStudents: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    attendanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  avatar: {
    type: String,
    default: ''
  },
  notes: String
}, {
  timestamps: true
});

export default mongoose.model<ITeacher>('Teacher', TeacherSchema);














