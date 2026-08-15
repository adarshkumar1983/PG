import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true }, mobile: { type: String }, email: String,
  emergencyContact: { name: String, relation: String, mobile: String },
  checkInDate: { type: Date, required: true }, checkOutDate: Date, agreementEndsAt: Date,
  securityDeposit: { type: Number, min: 0, default: 0 }, roomId: mongoose.Schema.Types.ObjectId,
  bedId: mongoose.Schema.Types.ObjectId,
  stayType: { type: String, enum: ['monthly', 'daily'], default: 'monthly' },
  dailyRate: { type: Number, min: 0 },
  expectedCheckOutDate: Date,
  totalDays: { type: Number, min: 1 },
  documents: [{ type: { type: String, enum: ['aadhaar', 'pan', 'agreement', 'other'] }, storageKey: String, verified: Boolean }],
  status: { type: String, enum: ['draft', 'active', 'notice_period', 'checked_out'], default: 'draft' }
}, { timestamps: true });

residentSchema.index({ organizationId: 1, mobile: 1 });
residentSchema.index({ organizationId: 1, createdAt: -1 });
residentSchema.index({ organizationId: 1, propertyId: 1, status: 1 });
residentSchema.index({ organizationId: 1, userId: 1 });
export const Resident = mongoose.model('Resident', residentSchema);
