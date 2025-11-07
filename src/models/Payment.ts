import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  _id: string;
  paymentId: string;
  student: mongoose.Types.ObjectId;
  amount: number;
  currency: 'USD' | 'PKR';
  paymentType: 'tuition' | 'fee' | 'fine' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'paypal' | 'stripe';
  transactionId?: string;
  dueDate: Date;
  paidDate?: Date;
  description: string;
  receipt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'PKR'],
    default: 'USD'
  },
  paymentType: {
    type: String,
    enum: ['tuition', 'fee', 'fine', 'refund'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'credit_card', 'paypal', 'stripe'],
    required: true
  },
  transactionId: String,
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  description: {
    type: String,
    required: true
  },
  receipt: String
}, {
  timestamps: true
});

export default mongoose.model<IPayment>('Payment', PaymentSchema);












