import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Property } from '../models/Property.js';
import { Resident } from '../models/Resident.js';
import { Expense, Payment } from '../models/Finance.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { dashboard } from '../seed.js';
import { Organization } from '../models/Organization.js';
import { sendInviteEmail } from '../utils/mailer.js';
import * as mockStore from '../mockStore.js';

export const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Clean up temporary invalid ObjectIds generated on front-end
 */
function cleanTemporaryIds(rooms) {
  if (!Array.isArray(rooms)) return rooms;
  return rooms.map(room => {
    const cleanedRoom = { ...room };
    if (cleanedRoom._id && !mongoose.Types.ObjectId.isValid(cleanedRoom._id)) {
      delete cleanedRoom._id;
    }
    if (Array.isArray(cleanedRoom.beds)) {
      cleanedRoom.beds = cleanedRoom.beds.map(bed => {
        const cleanedBed = { ...bed };
        if (cleanedBed._id && !mongoose.Types.ObjectId.isValid(cleanedBed._id)) {
          delete cleanedBed._id;
        }
        return cleanedBed;
      });
    }
    return cleanedRoom;
  });
}

/**
 * Update bed status to occupied and link resident
 */
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

/**
 * Release bed and clear resident link
 */
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

/**
 * Simulate SMS and trigger invite email
 */
async function attemptSendInvitation(userEmail, userMobile, userName, role, organizationId, inviteLink) {
  try {
    let orgName = 'StayZen';
    if (isDbConnected()) {
      const org = await Organization.findById(organizationId).lean();
      if (org && org.name) {
        orgName = org.name;
      }
    } else {
      const prop = mockStore.mockProperties.find(p => p.organizationId === organizationId);
      if (prop && prop.name) {
        orgName = prop.name;
      }
    }

    if (userMobile) {
      console.log(`\n========================================`);
      console.log(`[SMS SIMULATION] Automatic SMS sent to ${userMobile}:`);
      console.log(`"Hello ${userName}, you have been invited to join the ${orgName} workspace on StayZen as a ${role}. Accept your invitation here: ${inviteLink}"`);
      console.log(`========================================\n`);
    }

    if (userEmail) {
      return await sendInviteEmail(userEmail, userName, role, orgName, inviteLink);
    }
  } catch (error) {
    console.error('Error in attemptSendInvitation:', error);
  }
}

/**
 * GET Dashboard stats for Landlord or Resident
 */
export async function getDashboard(tenant, auth) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    return { ...mockStore.getDashboardStats(), role: tenant.role };
  }

  const currentMonthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const user = await User.findById(auth.sub).lean();

  // Resident flow
  if (tenant.role === 'resident') {
    const resident = await Resident.findOne({ organizationId: tenant.organizationId, userId: auth.sub }).populate('propertyId').lean();
    if (!resident) {
      return {
        property: 'Not Assigned',
        owner: user?.name || 'Resident',
        month: currentMonthName,
        stats: { residents: 0, rooms: 0, occupiedBeds: 0, totalBeds: 0, collected: 0, pending: 0 },
        attention: [],
        payments: [],
        role: 'resident',
        residentDetails: null
      };
    }

    const payments = await Payment.find({ organizationId: tenant.organizationId, residentId: resident._id })
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

    return {
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
    };
  }

  // Landlord Flow
  const orgId = new mongoose.Types.ObjectId(tenant.organizationId);
  const filter = { organizationId: tenant.organizationId };

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

  return {
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
    role: tenant.role
  };
}

/**
 * GET residents
 */
export async function getResidents(tenant) {
  if (!isDbConnected()) return mockStore.mockResidents;
  return Resident.find({ organizationId: tenant.organizationId }).sort({ createdAt: -1 }).lean();
}

/**
 * POST resident
 */
export async function createResident(tenant, data) {
  if (!isDbConnected()) {
    return mockStore.addMockResident(data);
  }
  return Resident.create({ ...data, organizationId: tenant.organizationId });
}

/**
 * GET properties
 */
export async function getProperties(tenant) {
  if (!isDbConnected()) return mockStore.mockProperties;
  return Property.find({ organizationId: tenant.organizationId }).lean();
}

/**
 * POST property
 */
export async function createProperty(tenant, data) {
  if (!isDbConnected()) {
    return mockStore.addMockProperty(data);
  }
  if (data.rooms && Array.isArray(data.rooms)) {
    data.rooms = cleanTemporaryIds(data.rooms);
  }
  return Property.create({ ...data, organizationId: tenant.organizationId });
}

/**
 * PUT property
 */
export async function updateProperty(tenant, id, data) {
  if (!isDbConnected()) {
    const updatedProp = mockStore.updateMockProperty(id, data);
    if (!updatedProp) {
      const err = new Error('Property not found');
      err.status = 404;
      throw err;
    }
    return updatedProp;
  }
  if (data.rooms && Array.isArray(data.rooms)) {
    data.rooms = cleanTemporaryIds(data.rooms);
  }
  const updatedProperty = await Property.findOneAndUpdate(
    { _id: id, organizationId: tenant.organizationId },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!updatedProperty) {
    const err = new Error('Property not found');
    err.status = 404;
    throw err;
  }
  return updatedProperty;
}

/**
 * GET members
 */
export async function getMembers(tenant) {
  if (!isDbConnected()) return mockStore.mockMembers;
  const filter = { organizationId: tenant.organizationId };
  const memberships = await Membership.find(filter).populate('userId', 'name email mobile status').sort({ createdAt: -1 }).lean();
  const residents = await Resident.find(filter).lean();
  const residentMap = new Map(residents.map(r => [r.userId?.toString(), r]));

  return memberships.map(m => {
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
  });
}

/**
 * POST member
 */
export async function createMember(tenant, data) {
  const { name, email, mobile, role, propertyId, roomId, bedId } = data;
  if (!name || !email || !['owner', 'staff', 'resident'].includes(role)) {
    const err = new Error('Name, email address and a valid role are required.');
    err.status = 400;
    throw err;
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET || 'development-only-change-me';

  if (!isDbConnected()) {
    const mockMem = mockStore.addMockMember({ name, email, mobile, role, propertyId, roomId, bedId });
    const inviteToken = jwt.sign({ membershipId: mockMem.id, email: email || mobile }, accessSecret, { expiresIn: '7d' });
    const inviteLink = `http://localhost:5173/accept-invite?token=${inviteToken}`;
    attemptSendInvitation(email, mobile, name, role, tenant.organizationId, inviteLink);
    return { ...mockMem, inviteLink };
  }

  let user = await User.findOne({ $or: [...(email ? [{ email: email.toLowerCase() }] : []), ...(mobile ? [{ mobile }] : [])] });
  if (!user) {
    user = await User.create({ name, email, mobile });
  } else {
    const existingMembership = await Membership.findOne({ organizationId: tenant.organizationId, userId: user.id });
    if (existingMembership) {
      const err = new Error('This email or mobile number is already registered in this property.');
      err.status = 400;
      throw err;
    }
  }

  const membership = await Membership.create({ organizationId: tenant.organizationId, userId: user.id, role, status: 'invited' });

  if (role === 'resident' && propertyId) {
    const resident = await Resident.create({
      organizationId: tenant.organizationId,
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

  attemptSendInvitation(user.email, user.mobile, user.name, role, tenant.organizationId, inviteLink);

  return {
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
  };
}

/**
 * PUT member
 */
export async function updateMember(tenant, id, data) {
  const { role, propertyId, roomId, bedId } = data;
  if (!['owner', 'staff', 'resident'].includes(role)) {
    const err = new Error('A valid role is required.');
    err.status = 400;
    throw err;
  }

  if (!isDbConnected()) {
    const updated = mockStore.updateMockMemberRole(id, role, propertyId, roomId, bedId);
    if (!updated) {
      const err = new Error('Mock member not found');
      err.status = 404;
      throw err;
    }
    return updated;
  }

  const membership = await Membership.findOne({ _id: id, organizationId: tenant.organizationId });
  if (!membership) {
    const err = new Error('Member not found.');
    err.status = 404;
    throw err;
  }

  membership.role = role;
  await membership.save();

  const user = await User.findById(membership.userId);
  let resident = await Resident.findOne({ organizationId: tenant.organizationId, userId: membership.userId });

  if (role === 'resident') {
    if (!resident) {
      resident = await Resident.create({
        organizationId: tenant.organizationId,
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

  return {
    id: updatedMembership._id,
    name: updatedMembership.userId.name,
    email: updatedMembership.userId.email,
    mobile: updatedMembership.userId.mobile,
    role: updatedMembership.role,
    status: updatedMembership.status,
    propertyId: resident?.propertyId,
    roomId: resident?.roomId,
    bedId: resident?.bedId
  };
}

/**
 * POST resend invite
 */
export async function resendInvite(tenant, id) {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'development-only-change-me';

  if (!isDbConnected()) {
    const updated = mockStore.resendMockInvite(id);
    if (!updated) {
      const err = new Error('Mock member not found');
      err.status = 404;
      throw err;
    }
    const inviteToken = jwt.sign({ membershipId: updated.id, email: updated.email || updated.mobile }, accessSecret, { expiresIn: '7d' });
    const inviteLink = `http://localhost:5173/accept-invite?token=${inviteToken}`;
    attemptSendInvitation(updated.email, updated.mobile, updated.name, updated.role, tenant.organizationId, inviteLink);
    return { ...updated, inviteLink };
  }

  const membership = await Membership.findOne({ _id: id, organizationId: tenant.organizationId });
  if (!membership) {
    const err = new Error('Member not found.');
    err.status = 404;
    throw err;
  }

  membership.status = 'invited';
  await membership.save();

  const user = await User.findById(membership.userId);
  if (!user) {
    const err = new Error('User associated with member not found.');
    err.status = 404;
    throw err;
  }

  const inviteToken = jwt.sign({ membershipId: membership.id, email: user.email || user.mobile }, accessSecret, { expiresIn: '7d' });
  const inviteLink = `http://localhost:5173/accept-invite?token=${inviteToken}`;

  attemptSendInvitation(user.email, user.mobile, user.name, membership.role, tenant.organizationId, inviteLink);

  const resident = await Resident.findOne({ organizationId: tenant.organizationId, userId: membership.userId });

  return {
    id: membership.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: membership.role,
    status: 'invited',
    inviteLink,
    propertyId: resident?.propertyId,
    roomId: resident?.roomId,
    bedId: resident?.bedId
  };
}

/**
 * GET payments
 */
export async function getPayments(tenant) {
  if (!isDbConnected()) return dashboard.payments;
  return Payment.find({ organizationId: tenant.organizationId }).sort({ createdAt: -1 }).lean();
}

/**
 * POST expenses
 */
export async function createExpense(tenant, auth, data) {
  return Expense.create({ ...data, organizationId: tenant.organizationId, recordedBy: auth.sub });
}
