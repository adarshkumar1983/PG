import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['owner', 'staff', 'resident'], required: true },
  permissions: { type: [String], default: [] },
  status: { type: String, enum: ['invited', 'active', 'disabled'], default: 'active' }
}, { timestamps: true });

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
export const Membership = mongoose.model('Membership', membershipSchema);
