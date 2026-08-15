import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { type: String, enum: ['payment', 'settlement', 'system'], default: 'payment' },
  read: { type: Boolean, default: false, index: true },
  data: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

notificationSchema.index({ organizationId: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, read: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
