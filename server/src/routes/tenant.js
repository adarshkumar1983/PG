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

async function allocateBed(residentId, propertyId, roomId, bedId) {
  if (!propertyId || !roomId || !bedId) return;
  const property = await Property.findById(propertyId);
  if (!property) return;
  const room = property.rooms.id(roomId);
  if (!room) return;
  const bed = room.beds.id(bedId);
  if (!bed) return;
  bed.status = 'occupied';
  bed.residentId = residentId;
  await property.save();
}

async function releaseBed(propertyId, roomId, bedId) {
  if (!propertyId || !roomId || !bedId) return;
  const property = await Property.findById(propertyId);
  if (!property) return;
  const room = property.rooms.id(roomId);
  if (!room) return;
  const bed = room.beds.id(bedId);
  if (!bed) return;
  bed.status = 'vacant';
  bed.residentId = undefined;
  await property.save();
}

router.get('/dashboard', (req, res, next) => {
  const allowed = req.tenant?.permissions || [];
  if (allowed.includes('*') || allowed.includes(permissions.REPORT_READ) || allowed.includes(permissions.PAYMENT_OWN_READ)) {
    return next();
  }
  return res.status(403).json({ message: 'Insufficient permission.' });
}, async (req, res) => {
  if (req.tenant.organizationId === 'demo-org' || !isDbConnected()) {
    return res.json({ ...mockStore.getDashboardStats(), role: req.tenant.role });
  }

  const currentMonthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const user = await User.findById(req.auth.sub).lean();

  if (req.tenant.role === 'resident') {
    const resident = await Resident.findOne({ organizationId: req.tenant.organizationId, userId: req.auth.sub }).populate('propertyId').lean();
    if (!resident) {
      return res.json({
        property: 'Not Assigned',
        owner: user?.name || 'Resident',
        month: currentMonthName,
        stats: { residents: 0, rooms: 0, occupiedBeds: 0, totalBeds: 0, collected: 0, pending: 0 },
        attention: [],
        payments: [],
        role: 'resident',
        residentDetails: null
      });
    }

    const payments = await Payment.find({ organizationId: req.tenant.organizationId, residentId: resident._id })
      .sort({ createdAt: -1 })
      .lean();

    const collected = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const pending = payments.filter(p => p.status === 'due').reduce((sum, p) => sum + p.amount, 0);

    const prop = resident.propertyId;
    let roomNumber = 'N/A';
    let bedLabel = 'N/A';
    let rentAmount = 0;
    if (prop && resident.roomId) {
      const room = prop.rooms.find(r => r._id.toString() === resident.roomId.toString());
      if (room) {
        roomNumber = room.number;
        const bed = room.beds.find(b => b._id.toString() === resident.bedId?.toString());
        if (bed) {
          bedLabel = bed.label;
          rentAmount = bed.monthlyRent;
        }
      }
    }

    const formattedPayments = payments.map(p => {
      let status = 'Paid';
      if (p.status === 'due') status = 'Overdue';
      else if (p.status === 'pending') status = 'Due soon';

      const dateStr = p.status === 'paid' && p.paidAt 
        ? `Paid ${new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : `Due for ${p.invoiceMonth}`;

      return {
        name: user?.name || 'You',
        room: `Room ${roomNumber} · ${bedLabel}`,
        amount: p.amount,
        status,
        date: dateStr,
        initials: user?.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U',
        color: '#17644f'
      };
    });

    return res.json({
      property: prop?.name || 'My PG',
      owner: user?.name || 'Resident',
      month: currentMonthName,
      stats: {
        residents: 1,
        rooms: 1,
        occupiedBeds: 1,
        totalBeds: 1,
        collected,
        pending
      },
      attention: [
        {
          id: 1,
          type: pending > 0 ? 'danger' : 'info',
          icon: '₹',
          title: pending > 0 ? 'Pending dues' : 'All clear',
          meta: pending > 0 ? `₹${new Intl.NumberFormat('en-IN').format(pending)} outstanding` : 'No dues pending',
          action: 'Pay rent'
        }
      ],
      payments: formattedPayments,
      role: 'resident',
      residentDetails: {
        propertyName: prop?.name || 'N/A',
        address: prop?.address || 'N/A',
        roomNumber,
        bedLabel,
        rentAmount,
        checkInDate: resident.checkInDate
      }
    });
  }

  // Landlord Flow
  const orgId = new mongoose.Types.ObjectId(req.tenant.organizationId);
  const filter = tenantFilter(req);

  const [
    residentsCount,
    properties,
    paidPayments,
    pendingPayments,
    recentPaymentsDb
  ] = await Promise.all([
    Resident.countDocuments({ ...filter, status: 'active' }),
    Property.find(filter).lean(),
    Payment.aggregate([
      { $match: { organizationId: orgId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Payment.aggregate([
      { $match: { organizationId: orgId, status: 'due' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Payment.find(filter)
      .populate('residentId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  const beds = properties.flatMap(p => p.rooms.flatMap(r => r.beds));
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
  const vacantBeds = totalBeds - occupiedBeds;
  const roomsCount = properties.reduce((acc, p) => acc + p.rooms.length, 0);

  const collected = paidPayments[0]?.total || 0;
  const pending = pendingPayments[0]?.total || 0;

  const formattedPayments = recentPaymentsDb.map(p => {
    const resName = p.residentId?.name || 'Resident';
    const initials = resName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const colors = ['#efb36f', '#7ab4aa', '#8ca4d8', '#c196d2', '#d97b7b'];
    const charCodeSum = resName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const color = colors[charCodeSum % colors.length];
    
    let status = 'Paid';
    if (p.status === 'due') status = 'Overdue';
    else if (p.status === 'pending') status = 'Due soon';
    
    const dateStr = p.status === 'paid' && p.paidAt 
      ? `Paid ${new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      : `Due for ${p.invoiceMonth}`;

    // Find room info if possible
    let roomLabel = 'General';
    if (p.residentId) {
      const residentObj = p.residentId;
      const prop = properties.find(pr => pr._id.toString() === p.propertyId?.toString());
      if (prop) {
        const room = prop.rooms.find(rm => rm._id.toString() === residentObj.roomId?.toString());
        if (room) {
          const bed = room.beds.find(bd => bd._id.toString() === residentObj.bedId?.toString());
          roomLabel = `${room.number} · ${bed ? bed.label : 'Bed'}`;
        }
      }
    }

    return {
      name: resName,
      room: roomLabel,
      amount: p.amount,
      status,
      date: dateStr,
      initials,
      color
    };
  });

  const overduePaymentsCount = recentPaymentsDb.filter(p => p.status === 'due').length;

  res.json({
    property: properties[0]?.name || 'My PG',
    owner: user?.name || 'Owner',
    month: currentMonthName,
    stats: {
      residents: residentsCount,
      rooms: roomsCount,
      occupiedBeds,
      totalBeds,
      collected,
      pending
    },
    attention: [
      { 
        id: 1, 
        type: 'danger', 
        icon: '₹', 
        title: `${overduePaymentsCount} rent payments overdue`, 
        meta: `₹${new Intl.NumberFormat('en-IN').format(pending)} outstanding`, 
        action: 'Review dues' 
      },
      { 
        id: 2, 
        type: 'warn', 
        icon: '⌛', 
        title: '0 agreements expiring', 
        meta: 'Within the next 30 days', 
        action: 'View residents' 
      },
      { 
        id: 3, 
        type: 'info', 
        icon: '▦', 
        title: `${vacantBeds} beds are available`, 
        meta: `Across ${properties.reduce((acc, p) => acc + p.rooms.filter(r => r.beds.some(b => b.status === 'vacant')).length, 0)} rooms`, 
        action: 'View inventory' 
      }
    ],
    payments: formattedPayments,
    role: req.tenant.role
  });
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
  
  const residents = await Resident.find(tenantFilter(req)).lean();
  const residentMap = new Map(residents.map(r => [r.userId?.toString(), r]));

  res.json(memberships.map(m => {
    const resDoc = m.role === 'resident' ? residentMap.get(m.userId?._id?.toString()) : null;
    return {
      id: m._id,
      name: m.userId?.name,
      email: m.userId?.email,
      mobile: m.userId?.mobile,
      role: m.role,
      status: m.status,
      propertyId: resDoc?.propertyId,
      roomId: resDoc?.roomId,
      bedId: resDoc?.bedId
    };
  }));
});
router.post('/members', authorize(permissions.STAFF_MANAGE), async (req, res) => {
  const { name, email, mobile, role, propertyId, roomId, bedId } = req.body;
  if (!name || (!email && !mobile) || !['owner','staff','resident'].includes(role)) return res.status(400).json({ message:'Name, contact and a valid role are required.' });
  
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'development-only-change-me';

  if (!isDbConnected()) {
    const mockMem = mockStore.addMockMember({ name, email, mobile, role, propertyId, roomId, bedId });
    const inviteToken = jwt.sign({ membershipId: mockMem.id, email: email || mobile }, accessSecret, { expiresIn: '7d' });
    const inviteLink = `http://localhost:5173/accept-invite?token=${inviteToken}`;
    return res.status(201).json({ ...mockMem, inviteLink });
  }
  
  try {
    let user = await User.findOne({ $or:[...(email?[{email:email.toLowerCase()}]:[]), ...(mobile?[{mobile}]:[])] });
    if (!user) {
      user = await User.create({ name, email, mobile });
    } else {
      // Check if membership already exists in this organization
      const existingMembership = await Membership.findOne({ organizationId: req.tenant.organizationId, userId: user.id });
      if (existingMembership) {
        return res.status(400).json({ message: 'This email or mobile number is already registered in this property.' });
      }
    }
    
    const membership = await Membership.create({ organizationId:req.tenant.organizationId, userId:user.id, role, status:'invited' });
    
    if (role === 'resident' && propertyId) {
      const resident = await Resident.create({
        organizationId: req.tenant.organizationId,
        propertyId,
        roomId,
        bedId,
        userId: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        checkInDate: new Date(),
        status: 'active'
      });
      if (roomId && bedId) {
        await allocateBed(resident._id, propertyId, roomId, bedId);
      }
    }
    
    const inviteToken = jwt.sign({ membershipId: membership.id, email: user.email || user.mobile }, accessSecret, { expiresIn: '7d' });
    const inviteLink = `http://localhost:5173/accept-invite?token=${inviteToken}`;
    
    res.status(201).json({
      id: membership.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role,
      status: 'invited',
      inviteLink,
      propertyId,
      roomId,
      bedId
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: error.message || 'An error occurred while creating the member.' });
  }
});
router.put('/members/:id', authorize(permissions.STAFF_MANAGE), async (req, res) => {
  const { role, propertyId, roomId, bedId } = req.body;
  if (!['owner', 'staff', 'resident'].includes(role)) {
    return res.status(400).json({ message: 'A valid role is required.' });
  }

  if (!isDbConnected()) {
    const updated = mockStore.updateMockMemberRole(req.params.id, role, propertyId, roomId, bedId);
    if (!updated) return res.status(404).json({ message: 'Mock member not found' });
    return res.json(updated);
  }

  try {
    const filter = tenantFilter(req);
    const membership = await Membership.findOne({ _id: req.params.id, organizationId: filter.organizationId });
    if (!membership) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    const oldRole = membership.role;
    membership.role = role;
    await membership.save();

    const user = await User.findById(membership.userId);
    let resident = await Resident.findOne({ organizationId: filter.organizationId, userId: membership.userId });
    
    if (role === 'resident') {
      if (!resident) {
        resident = await Resident.create({
          organizationId: filter.organizationId,
          propertyId,
          roomId,
          bedId,
          userId: membership.userId,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          checkInDate: new Date(),
          status: 'active'
        });
        if (propertyId && roomId && bedId) {
          await allocateBed(resident._id, propertyId, roomId, bedId);
        }
      } else {
        const bedChanged = resident.propertyId?.toString() !== propertyId?.toString() ||
                           resident.roomId?.toString() !== roomId?.toString() ||
                           resident.bedId?.toString() !== bedId?.toString();
        
        if (bedChanged) {
          if (resident.propertyId && resident.roomId && resident.bedId) {
            await releaseBed(resident.propertyId, resident.roomId, resident.bedId);
          }
          resident.propertyId = propertyId;
          resident.roomId = roomId;
          resident.bedId = bedId;
          await resident.save();
          if (propertyId && roomId && bedId) {
            await allocateBed(resident._id, propertyId, roomId, bedId);
          }
        }
      }
    } else {
      if (resident) {
        if (resident.propertyId && resident.roomId && resident.bedId) {
          await releaseBed(resident.propertyId, resident.roomId, resident.bedId);
        }
        await Resident.deleteOne({ _id: resident._id });
        resident = null;
      }
    }

    const updatedMembership = await Membership.findById(membership.id).populate('userId', 'name email mobile status').lean();
    
    res.json({
      id: updatedMembership._id,
      name: updatedMembership.userId.name,
      email: updatedMembership.userId.email,
      mobile: updatedMembership.userId.mobile,
      role: updatedMembership.role,
      status: updatedMembership.status,
      propertyId: resident?.propertyId,
      roomId: resident?.roomId,
      bedId: resident?.bedId
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ message: error.message || 'An error occurred while updating the member role.' });
  }
});
router.get('/payments', authorize(permissions.PAYMENT_READ), async (req, res) => {
  if (!isDbConnected()) return res.json(dashboard.payments);
  res.json(await Payment.find(tenantFilter(req)).sort({ createdAt: -1 }).lean());
});
router.post('/expenses', authorize(permissions.EXPENSE_WRITE), async (req, res) => {
  res.status(201).json(await Expense.create({ ...req.body, organizationId: req.tenant.organizationId, recordedBy: req.auth.sub }));
});

export default router;
