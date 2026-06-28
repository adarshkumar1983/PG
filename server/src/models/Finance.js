import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  invoiceMonth: { type: String, required: true }, amount: { type: Number, required: true, min: 0 },
  lateFee: { type: Number, default: 0 }, method: { type: String, enum: ['upi', 'card', 'netbanking', 'cash'] },
  gatewayPaymentId: String, gatewaySettlementId: String,
  status: { type: String, enum: ['due', 'pending', 'paid', 'failed', 'refunded'], default: 'due' },
  paidAt: Date
}, { timestamps: true });
paymentSchema.index({ organizationId: 1, residentId: 1, invoiceMonth: 1 }, { unique: true });

const expenseSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  category: { type: String, enum: ['electricity', 'wifi', 'maintenance', 'salary', 'other'], required: true },
  amount: { type: Number, required: true, min: 0 }, occurredAt: { type: Date, required: true },
  note: String, recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const Payment = mongoose.model('Payment', paymentSchema);
export const Expense = mongoose.model('Expense', expenseSchema);
