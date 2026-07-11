import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paidAt: { type: Date, required: true },
  method: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'card', 'online_gateway'], required: true },
  referenceNumber: String,
  notes: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  invoiceMonth: { type: String, required: true },
  purpose: { type: String, enum: ['rent', 'security_deposit', 'electricity', 'water', 'maintenance', 'fine', 'other'], default: 'rent', required: true },
  amount: { type: Number, required: true, min: 0 },
  receivedAmount: { type: Number, default: 0, min: 0 },
  lateFee: { type: Number, default: 0 },
  method: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'card', 'online_gateway'] },
  gatewayPaymentId: String,
  gatewaySettlementId: String,
  status: { type: String, enum: ['due', 'pending', 'paid', 'partially_paid', 'failed', 'refunded'], default: 'due' },
  paidAt: Date,
  referenceNumber: String,
  notes: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transactions: [transactionSchema],
  history: [{
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });
paymentSchema.index({ organizationId: 1, residentId: 1, invoiceMonth: 1, purpose: 1 }, { unique: true });

const expenseSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  category: { type: String, enum: ['electricity', 'wifi', 'maintenance', 'salary', 'other'], required: true },
  amount: { type: Number, required: true, min: 0 }, occurredAt: { type: Date, required: true },
  note: String, recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const Payment = mongoose.model('Payment', paymentSchema);
export const Expense = mongoose.model('Expense', expenseSchema);
