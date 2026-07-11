import mongoose from 'mongoose';

const maintenanceConfigSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  name: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  chargeType: { type: String, enum: ['fixed', 'percentage'], required: true },
  billingFrequency: {
    type: String,
    enum: ['monthly', '2_months', '3_months', '6_months', 'yearly', 'one_time', 'custom'],
    required: true
  },
  customMonths: { type: Number, default: 1 },
  startDate: { type: Date, required: true },
  endDate: Date,
  dueDateRule: { type: Number, default: 5 },
  applicableTo: {
    type: String,
    enum: ['all', 'building', 'floor', 'room', 'bed', 'member'],
    required: true
  },
  targetIds: [{ type: String }],
  mergeInvoice: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const MaintenanceConfig = mongoose.model('MaintenanceConfig', maintenanceConfigSchema);
export default MaintenanceConfig;
