import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'active', 'rejected', 'suspended'], default: 'pending' },
  plan: { type: String, enum: ['trial', 'starter', 'growth', 'enterprise'], default: 'trial' },
  subscriptionStatus: { type: String, enum: ['trialing', 'active', 'past_due', 'cancelled'], default: 'trialing' },
  gateway: {
    provider: { type: String, enum: ['razorpay', 'cashfree', 'none'], default: 'none' },
    linkedAccountId: String,
    onboardingStatus: { type: String, enum: ['not_started', 'pending', 'active', 'restricted'], default: 'not_started' }
  }
}, { timestamps: true });

export const Organization = mongoose.model('Organization', organizationSchema);
