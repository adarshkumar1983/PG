import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sessionSchema = new mongoose.Schema({
  refreshTokenHash: { type: String, required: true },
  device: String,
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
  mobile: { type: String, trim: true, sparse: true, unique: true },
  passwordHash: { type: String, select: false },
  platformRole: { type: String, enum: ['super_admin', 'user'], default: 'user' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  sessions: { type: [sessionSchema], select: false, default: [] },
  lastLoginAt: Date
}, { timestamps: true });

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};
userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash || '');
};

export const User = mongoose.model('User', userSchema);
