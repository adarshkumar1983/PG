import { Router } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Membership } from '../models/Membership.js';
import * as mockStore from '../mockStore.js';
import { sendResetPasswordEmail } from '../utils/mailer.js';

const router = Router();

const accessSecret = () => {
  const s = process.env.JWT_ACCESS_SECRET;
  if (process.env.NODE_ENV === 'production' && (!s || s.includes('change-me'))) {
    throw new Error('FATAL: JWT_ACCESS_SECRET must be configured securely in production.');
  }
  return s || 'dev-access-secret-entropy-9988223311';
};

const refreshSecret = () => {
  const s = process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === 'production' && (!s || s.includes('change-me'))) {
    throw new Error('FATAL: JWT_REFRESH_SECRET must be configured securely in production.');
  }
  return s || 'dev-refresh-secret-entropy-1133228899';
};

const signAccess = user => jwt.sign({ sub: user.id, platformRole: user.platformRole }, accessSecret(), { expiresIn: '15m' });

const isDbConnected = () => mongoose.connection.readyState === 1;

const getAppUrl = () => {
  return process.env.APP_URL || process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';
};

router.post('/register', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(201).json({ message: 'Registration submitted for approval (Demo mode). Since MongoDB is offline, please log in using the demo account.', organizationId: 'demo-org' });
  }
  const { name, email, mobile, password, organizationName } = req.body;
  if (!name || !email || !password || !organizationName) return res.status(400).json({ message: 'Name, email, password and PG name are required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  
  const user = new User({ name, email: email.toLowerCase().trim(), mobile: mobile?.trim() }); 
  await user.setPassword(password); 
  await user.save();
  
  const slug = `${organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${user.id.slice(-5)}`;
  const organization = await Organization.create({ name: organizationName, slug, ownerUserId: user.id });
  await Membership.create({ organizationId: organization.id, userId: user.id, role: 'owner' });
  res.status(201).json({ message: 'Registration submitted for approval.', organizationId: organization.id });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (!isDbConnected()) {
    if (email === 'owner@stayzen.demo' && password === 'demo1234') {
      return res.json({ accessToken: jwt.sign({ sub: 'demo-owner', platformRole: 'user' }, accessSecret(), { expiresIn: '15m' }), user: { name: 'Adarsh Kumar', email: 'owner@stayzen.demo', role: 'owner' }, organizations: [{ id: 'demo-org', name: 'Greenview Residency', role: 'owner' }] });
    }
    return res.status(401).json({ message: 'Incorrect email or password. Please use the demo credentials when MongoDB is offline.' });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim(), status: 'active' }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(password))) return res.status(401).json({ message: 'Incorrect email or password.' });
  const memberships = await Membership.find({ userId: user.id, status: 'active' }).populate('organizationId', 'name status').lean();
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, refreshSecret(), { expiresIn: '30d' });
  res.json({ accessToken: signAccess(user), refreshToken, user: { id: user.id, name: user.name, email: user.email, platformRole: user.platformRole }, organizations: memberships.map(m => ({ id: m.organizationId._id, name: m.organizationId.name, role: m.role, status: m.organizationId.status })) });
});

router.post('/accept-invite', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password are required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long.' });

  try {
    const payload = jwt.verify(token, accessSecret());
    if (!isDbConnected()) {
      const member = mockStore.acceptMockInvite(payload.membershipId);
      if (!member) return res.status(404).json({ message: 'Mock invitation not found.' });
      return res.json({ message: 'Invitation accepted (Demo mode). Account activated!' });
    }
    const membership = await Membership.findById(payload.membershipId);
    if (!membership) return res.status(404).json({ message: 'Invitation not found or invalid.' });
    if (membership.status !== 'invited') return res.status(400).json({ message: 'Invitation has already been accepted or is disabled.' });

    const user = await User.findById(membership.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    await user.setPassword(password);
    user.status = 'active';
    await user.save();

    membership.status = 'active';
    await membership.save();

    res.json({ message: 'Account activated successfully! You can now sign in.' });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired invitation token.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email address is required.' });

  const genericResponse = { message: 'If the email is registered, a password reset link has been sent.' };

  try {
    const normalizedEmail = email.toLowerCase().trim();

    if (!isDbConnected()) {
      if (normalizedEmail === 'owner@stayzen.demo') {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const resetLink = `${getAppUrl()}/?resetToken=${rawToken}`;
        await sendResetPasswordEmail(normalizedEmail, 'Adarsh Kumar', resetLink);
      }
      return res.json(genericResponse);
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Return identical response to prevent user enumeration
      return res.json(genericResponse);
    }

    // Generate high-entropy single-use random reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
    await user.save();

    const resetLink = `${getAppUrl()}/?resetToken=${rawToken}`;
    await sendResetPasswordEmail(user.email, user.name, resetLink);

    return res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password are required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long.' });

  try {
    if (!isDbConnected()) {
      return res.json({ message: 'Password has been reset successfully (Demo mode). You can now log in.' });
    }

    // Hash the raw token sent from the client to check against the stored SHA-256 hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      // Backward compatibility check for JWT-based reset token
      try {
        const payload = jwt.verify(token, accessSecret());
        if (payload.type === 'reset-password' && payload.sub) {
          const jwtUser = await User.findById(payload.sub);
          if (jwtUser) {
            await jwtUser.setPassword(password);
            jwtUser.sessions = [];
            await jwtUser.save();
            return res.json({ message: 'Password has been reset successfully. You can now log in.' });
          }
        }
      } catch {}
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    // Update password
    await user.setPassword(password);
    
    // Invalidate the reset token immediately (single-use)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.sessions = []; // Invalidate previous sessions
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(400).json({ message: 'Invalid or expired reset token.' });
  }
});

export default router;
