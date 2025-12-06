import mongoose, { Document, Schema } from 'mongoose';

export interface IPairDailyReport extends Document {
  pair: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  sabq: string;
  sabqi: string;
  manzil: string;
  mistakes: string;
  correctionMethod: string;
  behaviorNote: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PairDailyReportSchema = new Schema<IPairDailyReport>({
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
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  sabq: {
    type: String,
    default: ''
  },
  sabqi: {
    type: String,
    default: ''
  },
  manzil: {
    type: String,
    default: ''
  },
  mistakes: {
    type: String,
    default: ''
  },
  correctionMethod: {
    type: String,
    default: ''
  },
  behaviorNote: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
PairDailyReportSchema.index({ pair: 1, student: 1, date: -1 });
PairDailyReportSchema.index({ student: 1, date: -1 });
PairDailyReportSchema.index({ teacher: 1, date: -1 });
PairDailyReportSchema.index({ date: -1 });

export default mongoose.model<IPairDailyReport>('PairDailyReport', PairDailyReportSchema);

