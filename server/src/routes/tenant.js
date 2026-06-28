import { Router } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, resolveTenant, tenantFilter } from '../auth/middleware.js';
import { permissions } from '../auth/permissions.js';
import { Property } from '../models/Property.js';
import { Resident } from '../models/Resident.js';
import { Expense, Payment } from '../models/Finance.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { dashboard } from '../seed.js';
import * as mockStore from '../mockStore.js';

const router = Router();
router.use(authenticate, resolveTenant);

const isDbConnected = () => mongoose.connection.readyState === 1;

router.get('/dashboard', authorize(permissions.REPORT_READ), async (req, res) => {
  if (req.tenant.organizationId === 'demo-org' || !isDbConnected()) return res.json({ ...mockStore.getDashboardStats(), role: req.tenant.role });
  const filter = tenantFilter(req);
  const [residents, properties, payments, expenses] = await Promise.all([
    Resident.countDocuments({ ...filter, status: 'active' }), Property.find(filter).lean(),
    Payment.aggregate([{ $match: { organizationId: filter.organizationId, status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { organizationId: filter.organizationId } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  const beds = properties.flatMap(p => p.rooms.flatMap(r => r.beds));
  res.json({ residents, occupiedBeds: beds.filter(b => b.status === 'occupied').length, vacantBeds: beds.filter(b => b.status === 'vacant').length, collected: payments[0]?.total || 0, expenses: expenses[0]?.total || 0 });
});

router.get('/residents', authorize(permissions.RESIDENT_READ), async (req, res) => {
  if (!isDbConnected()) return res.json(mockStore.mockResidents);
  res.json(await Resident.find(tenantFilter(req)).sort({ createdAt: -1 }).lean());
});
router.post('/residents', authorize(permissions.RESIDENT_WRITE), async (req, res) => {
  if (!isDbConnected()) {
    const newRes = mockStore.addMockResident(req.body);
    return res.status(201).json(newRes);
  }
  res.status(201).json(await Resident.create({ ...req.body, organizationId: req.tenant.organizationId }));
});
router.get('/properties', authorize(permissions.RESIDENT_READ), async (req, res) => {
  if (!isDbConnected()) return res.json(mockStore.mockProperties);
  res.json(await Property.find(tenantFilter(req)).lean());
});
router.post('/properties', authorize(permissions.MANAGE_PG), async (req, res) => {
  if (!isDbConnected()) {
    const newProp = mockStore.addMockProperty(req.body);
    return res.status(201).json(newProp);
  }
  res.status(201).json(await Property.create({ ...req.body, organizationId: req.tenant.organizationId }));
});
router.put('/properties/:id', authorize(permissions.MANAGE_PG), async (req, res) => {
  if (!isDbConnected()) {
    const updatedProp = mockStore.updateMockProperty(req.params.id, req.body);
    if (!updatedProp) return res.status(404).json({ message: 'Property not found' });
    return res.json(updatedProp);
  }
  const filter = tenantFilter(req);
  const updatedProperty = await Property.findOneAndUpdate(
    { _id: req.params.id, organizationId: filter.organizationId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updatedProperty) return res.status(404).json({ message: 'Property not found' });
  res.json(updatedProperty);
});
router.get('/members', authorize(permissions.STAFF_MANAGE), async (req, res) => {
  if (!isDbConnected()) return res.json(mockStore.mockMembers);
  const memberships = await Membership.find(tenantFilter(req)).populate('userId', 'name email mobile status').sort({ createdAt:-1 }).lean();
  res.json(memberships.map(m => ({ id:m._id, name:m.userId.name, email:m.userId.email, mobile:m.userId.mobile, role:m.role, status:m.status })));
});
router.post('/members', authorize(permissions.STAFF_MANAGE), async (req, res) => {
  const { name, email, mobile, role } = req.body;
  if (!name || (!email && !mobile) || !['owner','staff','resident'].includes(role)) return res.status(400).json({ message:'Name, contact and a valid role are required.' });
  
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'development-only-change-me';

  if (!isDbConnected()) {
    const mockMem = mockStore.addMockMember({ name, email, mobile, role });
    const inviteToken = jwt.sign({ membershipId: mockMem.id, email: email || mobile }, accessSecret, { expiresIn: '7d' });
    const inviteLink = `http://localhost:5173/accept-invite?token=${inviteToken}`;
    return res.status(201).json({ ...mockMem, inviteLink });
  }
  
  let user = await User.findOne({ $or:[...(email?[{email:email.toLowerCase()}]:[]), ...(mobile?[{mobile}]:[])] });
  if (!user) user = await User.create({ name, email, mobile });
  const membership = await Membership.create({ organizationId:req.tenant.organizationId, userId:user.id, role, status:'invited' });
  
  const inviteToken = jwt.sign({ membershipId: membership.id, email: user.email || user.mobile }, accessSecret, { expiresIn: '7d' });
  const inviteLink = `http://localhost:5173/accept-invite?token=${inviteToken}`;
  
  res.status(201).json({ id:membership.id, name:user.name, email:user.email, mobile:user.mobile, role, status:'invited', inviteLink });
});
router.get('/payments', authorize(permissions.PAYMENT_READ), async (req, res) => {
  if (!isDbConnected()) return res.json(dashboard.payments);
  res.json(await Payment.find(tenantFilter(req)).sort({ createdAt: -1 }).lean());
});
router.post('/expenses', authorize(permissions.EXPENSE_WRITE), async (req, res) => {
  res.status(201).json(await Expense.create({ ...req.body, organizationId: req.tenant.organizationId, recordedBy: req.auth.sub }));
});

export default router;
