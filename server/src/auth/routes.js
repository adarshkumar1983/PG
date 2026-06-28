import { Router } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Membership } from '../models/Membership.js';
import * as mockStore from '../mockStore.js';

const router = Router();
const accessSecret = () => process.env.JWT_ACCESS_SECRET || 'development-only-change-me';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || 'development-refresh-change-me';
const signAccess = user => jwt.sign({ sub: user.id, platformRole: user.platformRole }, accessSecret(), { expiresIn: '15m' });

const isDbConnected = () => mongoose.connection.readyState === 1;

router.post('/register', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(201).json({ message: 'Registration submitted for approval (Demo mode). Since MongoDB is offline, please log in using the demo account.', organizationId: 'demo-org' });
  }
  const { name, email, mobile, password, organizationName } = req.body;
  if (!name || !email || !password || !organizationName) return res.status(400).json({ message: 'Name, email, password and PG name are required.' });
  const user = new User({ name, email, mobile }); await user.setPassword(password); await user.save();
  const slug = `${organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${user.id.slice(-5)}`;
  const organization = await Organization.create({ name: organizationName, slug, ownerUserId: user.id });
  await Membership.create({ organizationId: organization.id, userId: user.id, role: 'owner' });
  res.status(201).json({ message: 'Registration submitted for approval.', organizationId: organization.id });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!isDbConnected()) {
    if (email === 'owner@stayzen.demo' && password === 'demo1234') {
      return res.json({ accessToken: jwt.sign({ sub: 'demo-owner', platformRole: 'user' }, accessSecret(), { expiresIn: '15m' }), user: { name: 'Adarsh Kumar', role: 'owner' }, organizations: [{ id: 'demo-org', name: 'Greenview Residency', role: 'owner' }] });
    }
    return res.status(401).json({ message: 'Incorrect email or password. Please use the demo credentials when MongoDB is offline.' });
  }
  const user = await User.findOne({ email, status: 'active' }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(password))) return res.status(401).json({ message: 'Incorrect email or password.' });
  const memberships = await Membership.find({ userId: user.id, status: 'active' }).populate('organizationId', 'name status').lean();
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, refreshSecret(), { expiresIn: '30d' });
  res.json({ accessToken: signAccess(user), refreshToken, user: { id: user.id, name: user.name, platformRole: user.platformRole }, organizations: memberships.map(m => ({ id: m.organizationId._id, name: m.organizationId.name, role: m.role, status: m.organizationId.status })) });
});

router.post('/accept-invite', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password are required.' });
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

export default router;
