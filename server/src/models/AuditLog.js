import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['create', 'edit', 'delete', 'record_payment', 'update'], required: true },
  entityType: { type: String, enum: ['Payment', 'Expense', 'Resident', 'Organization'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  details: {
    amount: Number,
    purpose: String,
    invoiceMonth: String,
    method: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    residentName: String
  }
}, { timestamps: true });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
