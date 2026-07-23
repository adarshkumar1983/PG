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
import { AuditLog } from '../models/AuditLog.js';
import { MaintenanceConfig } from '../models/MaintenanceConfig.js';
import { Notification } from '../models/Notification.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

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
    const org = await Organization.findById(tenant.organizationId).lean();
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
        _id: p._id,
        name: user?.name || 'You',
        room: `Room ${roomNumber} · ${bedLabel}`,
        amount: p.amount,
        status,
        rawStatus: p.status,
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
      upiId: org?.upiId || '',
      bankDetails: org?.bankDetails || null,
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
    allPaymentsDb,
    recentPaymentsDb
  ] = await Promise.all([
    Resident.countDocuments({ ...filter, status: 'active' }),
    Property.find(filter).lean(),
    Payment.find(filter).lean(),
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

  let collected = 0;
  let pending = 0;
  allPaymentsDb.forEach(p => {
    collected += p.receivedAmount || 0;
    if (['due', 'pending', 'partially_paid'].includes(p.status)) {
      pending += Math.max(0, (p.amount || 0) - (p.receivedAmount || 0));
    }
  });

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

  // Maintenance calculations
  let todaysMaintenanceCollections = 0;
  let pendingMaintenancePayments = 0;
  let totalMaintenanceRevenue = 0;
  
  const todayStr = new Date().toDateString();
  
  allPaymentsDb.forEach(p => {
    if (p.purpose === 'maintenance') {
      totalMaintenanceRevenue += p.receivedAmount || 0;
      
      if (p.transactions) {
        p.transactions.forEach(t => {
          if (new Date(t.paidAt).toDateString() === todayStr) {
            todaysMaintenanceCollections += t.amount || 0;
          }
        });
      } else if (p.status === 'paid' && p.paidAt && new Date(p.paidAt).toDateString() === todayStr) {
        todaysMaintenanceCollections += p.receivedAmount || 0;
      }
      
      if (['due', 'pending', 'partially_paid'].includes(p.status)) {
        pendingMaintenancePayments += Math.max(0, (p.amount || 0) - (p.receivedAmount || 0));
      }
    }
  });

  let nextMaintenanceDueDate = null;
  let upcomingMaintenanceCharges = 0;

  properties.forEach(prop => {
    if (prop.maintenanceEnabled && prop.maintenanceNextDueDate) {
      const dueDate = new Date(prop.maintenanceNextDueDate);
      if (!nextMaintenanceDueDate || dueDate < nextMaintenanceDueDate) {
        nextMaintenanceDueDate = dueDate;
      }
      const propResidentsCount = beds.filter(b => b.status === 'occupied').length;
      upcomingMaintenanceCharges += propResidentsCount * (prop.maintenanceAmount || 0);
    }
  });

  return {
    maintenanceStats: {
      todaysMaintenanceCollections,
      pendingMaintenancePayments,
      totalMaintenanceRevenue,
      nextMaintenanceDueDate,
      upcomingMaintenanceCharges
    },
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
    
    let rentAmount = 8500;
    if (roomId && bedId) {
      await allocateBed(resident._id, propertyId, roomId, bedId);
      
      const propertyDoc = await Property.findById(propertyId);
      if (propertyDoc) {
        const roomDoc = propertyDoc.rooms.id(roomId);
        if (roomDoc) {
          const bedDoc = roomDoc.beds.id(bedId);
          if (bedDoc) {
            rentAmount = bedDoc.monthlyRent;
          }
        }
      }
    }

    const currentMonthStr = new Date().toISOString().slice(0, 7);

    // Auto raise first rent invoice for the resident
    const paymentRecord = new Payment({
      organizationId: tenant.organizationId,
      propertyId,
      residentId: resident._id,
      invoiceMonth: currentMonthStr,
      purpose: 'rent',
      amount: rentAmount,
      receivedAmount: 0,
      status: 'due'
    });

    if (data.recordInitialPayment && data.paymentAmount > 0) {
      const transactionDate = new Date();
      paymentRecord.transactions.push({
        amount: Number(data.paymentAmount),
        paidAt: transactionDate,
        method: data.paymentMethod || 'cash',
        referenceNumber: data.paymentRef || '',
        notes: data.paymentNotes || '',
        recordedBy: user._id
      });

      paymentRecord.receivedAmount = Number(data.paymentAmount);
      paymentRecord.paidAt = transactionDate;
      paymentRecord.method = data.paymentMethod || 'cash';
      paymentRecord.referenceNumber = data.paymentRef || '';
      paymentRecord.notes = data.paymentNotes || '';
      paymentRecord.recordedBy = user._id;

      if (paymentRecord.receivedAmount >= paymentRecord.amount) {
        paymentRecord.status = 'paid';
      } else {
        paymentRecord.status = 'partially_paid';
      }

      paymentRecord.history.push({
        action: 'payment_recorded',
        performedBy: user._id,
        timestamp: transactionDate,
        details: { amount: data.paymentAmount, method: data.paymentMethod || 'cash', referenceNumber: data.paymentRef }
      });

      await paymentRecord.save();

      // Log to AuditLog
      await AuditLog.create({
        organizationId: tenant.organizationId,
        performedBy: user._id,
        action: 'record_payment',
        entityType: 'Payment',
        entityId: paymentRecord._id,
        details: {
          amount: data.paymentAmount,
          purpose: 'rent',
          invoiceMonth: currentMonthStr,
          method: data.paymentMethod || 'cash',
          residentName: resident.name,
          newValue: { status: paymentRecord.status, receivedAmount: paymentRecord.receivedAmount }
        }
      });
    } else {
      await paymentRecord.save();
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
export async function getPayments(tenant, auth) {
  if (!isDbConnected()) return mockStore.getMockPayments(tenant.organizationId, tenant.role === 'resident');
  const query = { organizationId: tenant.organizationId };
  if (tenant.role === 'resident' && auth) {
    const resident = await Resident.findOne({ organizationId: tenant.organizationId, userId: auth.sub }).lean();
    if (!resident) return [];
    query.residentId = resident._id;
  }
  return Payment.find(query)
    .populate('residentId', 'name mobile email roomId bedId')
    .populate('propertyId', 'name rooms')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * POST expenses
 */
export async function createExpense(tenant, auth, data) {
  if (!isDbConnected()) {
    return mockStore.createMockExpense(tenant.organizationId, auth.sub, data);
  }
  const user = await User.findById(auth.sub);
  const recordedBy = user ? user._id : auth.sub;
  return Expense.create({ ...data, organizationId: tenant.organizationId, recordedBy });
}

/**
 * GET all expenses
 */
export async function getExpenses(tenant) {
  if (!isDbConnected()) return mockStore.getMockExpenses(tenant.organizationId);
  return Expense.find({ organizationId: tenant.organizationId })
    .sort({ occurredAt: -1 })
    .lean();
}

/**
 * POST / Create a due payment (invoice)
 */
export async function createInvoice(tenant, data) {
  const { propertyId, residentId, invoiceMonth, purpose, amount } = data;
  if (!propertyId || !residentId || !invoiceMonth || !purpose || amount === undefined) {
    const err = new Error('Property, Resident, Month, Purpose and Amount are required.');
    err.status = 400;
    throw err;
  }

  if (!isDbConnected()) {
    return mockStore.createMockInvoice(tenant.organizationId, data);
  }

  const existing = await Payment.findOne({
    organizationId: tenant.organizationId,
    residentId,
    invoiceMonth,
    purpose: purpose.toLowerCase()
  });

  if (existing) {
    const err = new Error(`An invoice for ${purpose} in ${invoiceMonth} already exists for this resident.`);
    err.status = 400;
    throw err;
  }

  const invoice = await Payment.create({
    organizationId: tenant.organizationId,
    propertyId,
    residentId,
    invoiceMonth,
    purpose: purpose.toLowerCase(),
    amount,
    status: 'due',
    receivedAmount: 0
  });

  return invoice;
}

/**
 * POST / Record cash payment
 */
export async function recordCashPayment(tenant, auth, data) {
  const { propertyId, residentId, invoiceMonth, purpose, amount, paidAt, referenceNumber, notes, paymentId } = data;
  if (!residentId || !invoiceMonth || !purpose || amount === undefined || amount <= 0) {
    const err = new Error('Resident, Month, Purpose, and positive Amount are required.');
    err.status = 400;
    throw err;
  }

  if (!isDbConnected()) {
    return mockStore.recordMockCashPayment(tenant.organizationId, auth.sub, data);
  }

  const resident = await Resident.findById(residentId);
  if (!resident) {
    const err = new Error('Resident not found.');
    err.status = 404;
    throw err;
  }

  let paymentRecord;
  if (paymentId) {
    paymentRecord = await Payment.findOne({ _id: paymentId, organizationId: tenant.organizationId });
  } else {
    paymentRecord = await Payment.findOne({
      organizationId: tenant.organizationId,
      residentId,
      invoiceMonth,
      purpose: purpose.toLowerCase()
    });
  }

  const user = await User.findById(auth.sub);
  const recordedBy = user ? user._id : auth.sub;

  if (!paymentRecord) {
    paymentRecord = new Payment({
      organizationId: tenant.organizationId,
      propertyId: propertyId || resident.propertyId,
      residentId,
      invoiceMonth,
      purpose: purpose.toLowerCase(),
      amount: amount,
      receivedAmount: 0,
      status: 'due'
    });
  }

  const remainingDue = paymentRecord.amount - paymentRecord.receivedAmount;
  if (amount > remainingDue && !data.allowOverpayment) {
    const err = new Error(`Payment of ₹${amount} exceeds outstanding balance of ₹${remainingDue}.`);
    err.status = 400;
    throw err;
  }

  const transactionDate = paidAt ? new Date(paidAt) : new Date();
  
  paymentRecord.transactions.push({
    amount,
    paidAt: transactionDate,
    method: 'cash',
    referenceNumber,
    notes,
    recordedBy
  });

  paymentRecord.receivedAmount += amount;
  paymentRecord.paidAt = transactionDate;
  paymentRecord.method = 'cash';
  paymentRecord.referenceNumber = referenceNumber;
  paymentRecord.notes = notes;
  paymentRecord.recordedBy = recordedBy;

  if (paymentRecord.receivedAmount >= paymentRecord.amount) {
    paymentRecord.status = 'paid';
  } else if (paymentRecord.receivedAmount > 0) {
    paymentRecord.status = 'partially_paid';
  } else {
    paymentRecord.status = 'due';
  }

  paymentRecord.history.push({
    action: 'payment_recorded',
    performedBy: recordedBy,
    timestamp: new Date(),
    details: { amount, method: 'cash', referenceNumber }
  });

  await paymentRecord.save();

  await AuditLog.create({
    organizationId: tenant.organizationId,
    performedBy: recordedBy,
    action: 'record_payment',
    entityType: 'Payment',
    entityId: paymentRecord._id,
    details: {
      amount,
      purpose: purpose.toLowerCase(),
      invoiceMonth,
      method: 'cash',
      residentName: resident.name,
      newValue: { status: paymentRecord.status, receivedAmount: paymentRecord.receivedAmount }
    }
  });

  return paymentRecord;
}

/**
 * PUT / Update payment
 */
export async function updatePayment(tenant, auth, id, data) {
  if (!isDbConnected()) {
    return mockStore.updateMockPayment(tenant.organizationId, auth.sub, id, data);
  }

  const payment = await Payment.findOne({ _id: id, organizationId: tenant.organizationId });
  if (!payment) {
    const err = new Error('Payment not found.');
    err.status = 404;
    throw err;
  }

  if (payment.method !== 'cash' && payment.gatewayPaymentId) {
    const err = new Error('Online payments cannot be edited.');
    err.status = 400;
    throw err;
  }

  const user = await User.findById(auth.sub);
  const performedBy = user ? user._id : auth.sub;

  const oldValue = {
    amount: payment.amount,
    receivedAmount: payment.receivedAmount,
    status: payment.status,
    invoiceMonth: payment.invoiceMonth,
    purpose: payment.purpose,
    notes: payment.notes,
    referenceNumber: payment.referenceNumber
  };

  if (data.amount !== undefined) payment.amount = Number(data.amount);
  if (data.receivedAmount !== undefined) payment.receivedAmount = Number(data.receivedAmount);
  if (data.invoiceMonth !== undefined) payment.invoiceMonth = data.invoiceMonth;
  if (data.purpose !== undefined) payment.purpose = data.purpose.toLowerCase();
  if (data.notes !== undefined) payment.notes = data.notes;
  if (data.referenceNumber !== undefined) payment.referenceNumber = data.referenceNumber;
  if (data.status !== undefined) payment.status = data.status;

  if (data.status === undefined) {
    if (payment.receivedAmount >= payment.amount) {
      payment.status = 'paid';
    } else if (payment.receivedAmount > 0) {
      payment.status = 'partially_paid';
    } else {
      payment.status = 'due';
    }
  }

  payment.history.push({
    action: 'edit',
    performedBy,
    timestamp: new Date(),
    details: { oldValue, newValue: data }
  });

  await payment.save();

  const resident = await Resident.findById(payment.residentId).lean();
  await AuditLog.create({
    organizationId: tenant.organizationId,
    performedBy,
    action: 'edit',
    entityType: 'Payment',
    entityId: payment._id,
    details: {
      purpose: payment.purpose,
      invoiceMonth: payment.invoiceMonth,
      residentName: resident?.name || 'Resident',
      oldValue,
      newValue: data
    }
  });

  return payment;
}

/**
 * DELETE / Delete payment
 */
export async function deletePayment(tenant, auth, id) {
  if (!isDbConnected()) {
    return mockStore.deleteMockPayment(tenant.organizationId, auth.sub, id);
  }

  const payment = await Payment.findOne({ _id: id, organizationId: tenant.organizationId });
  if (!payment) {
    const err = new Error('Payment not found.');
    err.status = 404;
    throw err;
  }

  if (payment.method !== 'cash' && payment.gatewayPaymentId) {
    const err = new Error('Online payments cannot be deleted.');
    err.status = 400;
    throw err;
  }

  const user = await User.findById(auth.sub);
  const performedBy = user ? user._id : auth.sub;
  const resident = await Resident.findById(payment.residentId).lean();

  await AuditLog.create({
    organizationId: tenant.organizationId,
    performedBy,
    action: 'delete',
    entityType: 'Payment',
    entityId: payment._id,
    details: {
      amount: payment.amount,
      purpose: payment.purpose,
      invoiceMonth: payment.invoiceMonth,
      residentName: resident?.name || 'Resident',
      oldValue: {
        amount: payment.amount,
        receivedAmount: payment.receivedAmount,
        status: payment.status
      }
    }
  });

  await Payment.deleteOne({ _id: id, organizationId: tenant.organizationId });
  return { success: true };
}

/**
 * GET audit logs
 */
export async function getAuditLogs(tenant) {
  if (!isDbConnected()) {
    return mockStore.getMockAuditLogs(tenant.organizationId);
  }
  return AuditLog.find({ organizationId: tenant.organizationId })
    .populate('performedBy', 'name email mobile')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Refined Property-Level Maintenance Billing and Scheduling
 */
export function calculateNextDueDate(currentDueDate, frequency, customMonths = 1) {
  const date = new Date(currentDueDate);
  let monthsToAdd = 1;
  switch (frequency) {
    case 'monthly': monthsToAdd = 1; break;
    case '2_months': monthsToAdd = 2; break;
    case '3_months': monthsToAdd = 3; break;
    case '4_months': monthsToAdd = 4; break;
    case '6_months': monthsToAdd = 6; break;
    case 'yearly': monthsToAdd = 12; break;
    case 'custom': monthsToAdd = customMonths || 1; break;
  }
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
}

export async function checkAndGeneratePropertyMaintenanceCharges(tenant) {
  if (!isDbConnected()) {
    return mockStore.checkAndGenerateMockPropertyMaintenanceCharges(tenant.organizationId);
  }

  const today = new Date();
  
  // Find properties in the organization with maintenanceEnabled and nextDueDate <= today
  const properties = await Property.find({
    organizationId: tenant.organizationId,
    maintenanceEnabled: true,
    maintenanceNextDueDate: { $lte: today }
  });

  for (const property of properties) {
    const nextDueDate = property.maintenanceNextDueDate;
    const invoiceMonth = nextDueDate.toISOString().slice(0, 7);

    // Find all active residents
    const residents = await Resident.find({
      organizationId: tenant.organizationId,
      propertyId: property._id,
      status: 'active'
    });

    for (const resident of residents) {
      // Check duplicate
      const existing = await Payment.findOne({
        organizationId: tenant.organizationId,
        residentId: resident._id,
        invoiceMonth,
        purpose: 'maintenance',
        notes: `Maintenance charge for ${property.name}`
      });

      if (!existing) {
        const newPayment = await Payment.create({
          organizationId: tenant.organizationId,
          propertyId: property._id,
          residentId: resident._id,
          invoiceMonth,
          purpose: 'maintenance',
          amount: property.maintenanceAmount,
          receivedAmount: 0,
          status: 'due',
          notes: `Maintenance charge for ${property.name}`
        });

        // AuditLog
        await AuditLog.create({
          organizationId: tenant.organizationId,
          performedBy: tenant.organizationId,
          action: 'create',
          entityType: 'Payment',
          entityId: newPayment._id,
          details: {
            amount: property.maintenanceAmount,
            purpose: 'maintenance',
            invoiceMonth,
            residentName: resident.name
          }
        });
      }
    }

    // Advance next due date
    property.maintenanceNextDueDate = calculateNextDueDate(
      nextDueDate,
      property.maintenanceFrequency,
      property.maintenanceCustomMonths
    );
    await property.save();
  }
}

export async function initiateCharge(tenant, auth, paymentId) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    // Mock flow
    const mockPay = mockStore.mockPayments.find(p => p._id === paymentId);
    if (!mockPay) {
      throw new Error('Payment invoice not found.');
    }
    const outstanding = mockPay.amount - (mockPay.receivedAmount || 0);
    if (outstanding <= 0) {
      throw new Error('Payment already fully paid.');
    }
    const mockOrderId = 'order_mock_' + Math.random().toString(36).substr(2, 9);
    mockPay.gatewayOrderId = mockOrderId;
    return {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey123',
      orderId: mockOrderId,
      amount: outstanding * 100, // paise
      currency: 'INR',
      paymentId: mockPay._id,
      isMock: true
    };
  }

  // Real flow
  const payment = await Payment.findOne({ _id: paymentId, organizationId: tenant.organizationId });
  if (!payment) {
    throw new Error('Payment invoice not found.');
  }

  const outstanding = payment.amount - (payment.receivedAmount || 0);
  if (outstanding <= 0) {
    throw new Error('Payment already fully paid.');
  }

  // Fetch organization profile to get linkedAccountId
  const org = await Organization.findById(tenant.organizationId).lean();

  // Always use the Platform's global keys from .env
  const rzpKeyId = process.env.RAZORPAY_KEY_ID;
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!rzpKeyId || !rzpKeySecret) {
    // If keys are not set, return simulated response for development
    const mockOrderId = 'order_simulated_' + Math.random().toString(36).substr(2, 9);
    payment.gatewayOrderId = mockOrderId;
    await payment.save();
    return {
      keyId: 'rzp_test_simulatedkey123',
      orderId: mockOrderId,
      amount: outstanding * 100,
      currency: 'INR',
      paymentId: payment._id,
      isMock: true
    };
  }

  const razorpay = new Razorpay({
    key_id: rzpKeyId,
    key_secret: rzpKeySecret
  });

  const totalAmount = Math.round(outstanding * 100); // paise

  const orderPayload = {
    amount: totalAmount,
    currency: 'INR',
    receipt: payment._id.toString()
  };

  // If a linked account is set, calculate the split
  if (org && org.gateway && org.gateway.linkedAccountId) {
    // Calculate commission (2%)
    const commission = Math.round(totalAmount * 0.02);
    const routeAmount = totalAmount - commission;

    orderPayload.transfers = [
      {
        account: org.gateway.linkedAccountId,
        amount: routeAmount,
        currency: 'INR',
        on_hold: false
      }
    ];
  }

  const order = await razorpay.orders.create(orderPayload);

  payment.gatewayOrderId = order.id;
  await payment.save();

  return {
    keyId: rzpKeyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    paymentId: payment._id
  };
}

export async function verifyOnlinePayment(tenant, auth, payload) {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, paymentId } = payload;

  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    // Mock validation
    const mockPay = mockStore.mockPayments.find(p => p.gatewayOrderId === razorpay_order_id || p._id === paymentId);
    if (!mockPay) {
      throw new Error('Mock payment not found.');
    }
    const outstanding = mockPay.amount - (mockPay.receivedAmount || 0);
    mockPay.status = 'paid';
    mockPay.receivedAmount = mockPay.amount;
    mockPay.method = 'online_gateway';
    mockPay.gatewayPaymentId = razorpay_payment_id || 'pay_mock_success';
    mockPay.paidAt = new Date().toISOString();
    mockPay.transactions.push({
      amount: outstanding,
      paidAt: new Date().toISOString(),
      method: 'online_gateway',
      referenceNumber: razorpay_payment_id || 'pay_mock_success',
      notes: 'Paid online via Razorpay (Mock)'
    });
    return { success: true, message: 'Mock payment verified successfully.', payment: mockPay };
  }

  // Real DB flow
  const payment = await Payment.findOne({
    $or: [{ gatewayOrderId: razorpay_order_id }, { _id: paymentId }],
    organizationId: tenant.organizationId
  });
  if (!payment) {
    throw new Error('Payment invoice not found.');
  }

  // Always verify payment signature using the platform's global Key Secret
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (rzpKeySecret && razorpay_signature) {
    // Perform cryptographic verification
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', rzpKeySecret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      throw new Error('Razorpay signature verification failed.');
    }
  }

  const outstanding = payment.amount - (payment.receivedAmount || 0);
  if (outstanding > 0) {
    payment.transactions.push({
      amount: outstanding,
      paidAt: new Date(),
      method: 'online_gateway',
      referenceNumber: razorpay_payment_id || 'simulated_txn_' + Date.now(),
      notes: 'Paid online via Razorpay'
    });
    payment.receivedAmount = payment.amount;
    payment.status = 'paid';
    payment.method = 'online_gateway';
    payment.gatewayPaymentId = razorpay_payment_id || 'simulated_txn_' + Date.now();
    payment.paidAt = new Date();
    payment.history.push({
      action: 'payment_recorded',
      timestamp: new Date(),
      details: { amount: outstanding, method: 'online_gateway', referenceNumber: razorpay_payment_id }
    });
    await payment.save();
  }

  return { success: true, message: 'Payment verified and recorded successfully.', payment };
}

/**
 * GET Organization details
 */
export async function getOrganizationSettings(tenant) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    // Return mock organization info
    return {
      _id: 'demo-org',
      name: 'Greenview Residency (Demo)',
      slug: 'greenview-residency-demo',
      linkedAccountId: 'acc_demo123456789',
      upiId: 'owner@okaxis',
      bankDetails: {
        accountName: 'StayZen Realty Demo',
        accountNumber: '1234567890',
        bankName: 'HDFC Bank',
        ifscCode: 'HDFC0000123'
      }
    };
  }

  // Fetch real organization settings
  const org = await Organization.findById(tenant.organizationId).lean();
  if (!org) {
    throw new Error('Organization not found.');
  }

  return {
    _id: org._id,
    name: org.name,
    slug: org.slug,
    linkedAccountId: org.gateway?.linkedAccountId || '',
    upiId: org.upiId || '',
    bankDetails: org.bankDetails || {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: ''
    }
  };
}

/**
 * PUT / Update Organization details
 */
export async function updateOrganizationSettings(tenant, data) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    // For mock store, update mock details (not persistent, but returns success)
    return { success: true, message: 'Settings saved (Demo mode)' };
  }

  const org = await Organization.findById(tenant.organizationId);
  if (!org) {
    throw new Error('Organization not found.');
  }

  // Update fields
  if (data.name) org.name = data.name;
  if (data.upiId !== undefined) org.upiId = data.upiId;
  
  if (data.linkedAccountId !== undefined) {
    org.gateway = {
      ...org.gateway,
      linkedAccountId: data.linkedAccountId,
      provider: data.linkedAccountId ? 'razorpay' : 'none'
    };
  }

  if (data.bankDetails) {
    org.bankDetails = {
      accountName: data.bankDetails.accountName || '',
      accountNumber: data.bankDetails.accountNumber || '',
      bankName: data.bankDetails.bankName || '',
      ifscCode: data.bankDetails.ifscCode || ''
    };
  }

  await org.save();

  // AuditLog
  await AuditLog.create({
    organizationId: tenant.organizationId,
    performedBy: data.userId || tenant.organizationId,
    action: 'update',
    entityType: 'Organization',
    entityId: org._id,
    details: { name: org.name, upiId: org.upiId, linkedAccountId: data.linkedAccountId }
  });

  return {
    _id: org._id,
    name: org.name,
    slug: org.slug,
    linkedAccountId: org.gateway?.linkedAccountId || '',
    upiId: org.upiId || '',
    bankDetails: org.bankDetails
  };
}

/**
 * Razorpay Webhook Handler for Enterprise Settlement Lifecycle
 */
export async function handleRazorpayWebhook(event, payload) {
  if (!isDbConnected()) return { status: 'mock_ignored' };

  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentEntity = payload.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId && !paymentId) return;

    const paymentRecord = await Payment.findOne({
      $or: [{ gatewayOrderId: orderId }, { paymentId: paymentId }, { _id: paymentEntity?.notes?.paymentId }]
    });

    if (paymentRecord && paymentRecord.status !== 'paid') {
      const amount = paymentRecord.amount;
      const platformFee = Math.round(amount * 0.02 * 100) / 100; // 2%
      const ownerAmount = Math.round((amount - platformFee) * 100) / 100; // 98%

      const expSettlement = new Date();
      expSettlement.setDate(expSettlement.getDate() + 2); // 2 business days

      paymentRecord.status = 'paid';
      paymentRecord.paymentStatus = 'verified';
      paymentRecord.settlementStatus = 'processing';
      paymentRecord.paymentId = paymentId || paymentRecord.paymentId;
      paymentRecord.platformFee = platformFee;
      paymentRecord.ownerAmount = ownerAmount;
      paymentRecord.expectedSettlementDate = expSettlement;
      paymentRecord.receivedAmount = amount;
      paymentRecord.method = 'online_gateway';
      paymentRecord.paidAt = new Date();
      paymentRecord.gatewayPaymentId = paymentId;

      paymentRecord.transactions.push({
        amount: amount,
        paidAt: new Date(),
        method: 'online_gateway',
        referenceNumber: paymentId || 'webhook_cap',
        notes: 'Paid online via Razorpay (Webhook)'
      });

      await paymentRecord.save();

      // Trigger notification
      const resident = await Resident.findById(paymentRecord.residentId).lean();
      const residentName = resident?.name || 'Resident';

      await Notification.create({
        organizationId: paymentRecord.organizationId,
        title: 'Rent Payment Captured',
        message: `${residentName} has successfully paid ₹${new Intl.NumberFormat('en-IN').format(amount)} for ${paymentRecord.invoiceMonth} rent.`,
        type: 'payment',
        data: {
          paymentId: paymentRecord._id,
          amount,
          platformFee,
          ownerAmount,
          residentName
        }
      });
    }
  } else if (event === 'transfer.processed') {
    const transferEntity = payload.transfer?.entity;
    const transferId = transferEntity?.id;
    const paymentId = transferEntity?.payment_id;

    const paymentRecord = await Payment.findOne({
      $or: [{ paymentId: paymentId }, { transferId: transferId }]
    });

    if (paymentRecord) {
      paymentRecord.transferId = transferId || paymentRecord.transferId;
      paymentRecord.settlementStatus = 'processing';
      await paymentRecord.save();

      await Notification.create({
        organizationId: paymentRecord.organizationId,
        title: 'Settlement Initiated',
        message: `Transfer of ₹${new Intl.NumberFormat('en-IN').format(paymentRecord.ownerAmount || paymentRecord.amount)} initiated via Razorpay Route.`,
        type: 'settlement',
        data: { paymentId: paymentRecord._id, transferId }
      });
    }
  } else if (event === 'settlement.processed') {
    const settlementEntity = payload.settlement?.entity;
    const settlementId = settlementEntity?.id;

    const payments = await Payment.find({
      organizationId: { $exists: true },
      settlementStatus: 'processing'
    });

    for (const paymentRecord of payments) {
      paymentRecord.settlementStatus = 'completed';
      paymentRecord.settledAt = new Date();
      paymentRecord.gatewaySettlementId = settlementId;
      await paymentRecord.save();

      await Notification.create({
        organizationId: paymentRecord.organizationId,
        title: 'Settlement Completed',
        message: `Funds of ₹${new Intl.NumberFormat('en-IN').format(paymentRecord.ownerAmount)} transferred to bank account.`,
        type: 'settlement',
        data: { paymentId: paymentRecord._id, settlementId }
      });
    }
  } else if (event === 'transfer.failed') {
    const transferEntity = payload.transfer?.entity;
    const transferId = transferEntity?.id;

    const paymentRecord = await Payment.findOne({ transferId });
    if (paymentRecord) {
      paymentRecord.settlementStatus = 'failed';
      paymentRecord.failureReason = transferEntity?.error_description || 'Route transfer failed';
      await paymentRecord.save();

      await Notification.create({
        organizationId: paymentRecord.organizationId,
        title: 'Settlement Transfer Failed',
        message: `Transfer of ₹${new Intl.NumberFormat('en-IN').format(paymentRecord.ownerAmount)} failed. Logged for reconciliation.`,
        type: 'system',
        data: { paymentId: paymentRecord._id, error: paymentRecord.failureReason }
      });
    }
  }
}

/**
 * GET Settlement Analytics for Owner Dashboard
 */
export async function getSettlementAnalytics(tenant) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    return {
      monthlyEarnings: 462500,
      pendingSettlements: 49000,
      totalFeeCollected: 9250,
      completedSettlementsCount: 18,
      recentSettlements: mockStore.mockPayments.map(p => ({
        ...p,
        platformFee: Math.round(p.amount * 0.02),
        ownerAmount: Math.round(p.amount * 0.98),
        settlementStatus: p.status === 'paid' ? 'completed' : 'processing',
        expectedSettlementDate: new Date(Date.now() + 86400000).toISOString()
      }))
    };
  }

  const payments = await Payment.find({ organizationId: tenant.organizationId })
    .populate('residentId', 'name room bed')
    .sort({ createdAt: -1 })
    .lean();

  let monthlyEarnings = 0;
  let pendingSettlements = 0;
  let totalFeeCollected = 0;
  let completedSettlementsCount = 0;

  const currentMonthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const formattedSettlements = payments.map(p => {
    const amount = p.amount || 0;
    const platformFee = p.platformFee || Math.round(amount * 0.02 * 100) / 100;
    const ownerAmount = p.ownerAmount || Math.round((amount - platformFee) * 100) / 100;
    const isPaid = p.status === 'paid';

    if (isPaid) {
      if (p.invoiceMonth === currentMonthName || !p.invoiceMonth) {
        monthlyEarnings += ownerAmount;
      }
      totalFeeCollected += platformFee;

      if (p.settlementStatus === 'completed') {
        completedSettlementsCount += 1;
      } else {
        pendingSettlements += ownerAmount;
      }
    }

    const expDate = p.expectedSettlementDate || new Date(new Date(p.paidAt || p.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000);

    return {
      ...p,
      residentName: p.residentId?.name || p.name || 'Resident',
      platformFee,
      ownerAmount,
      settlementStatus: p.settlementStatus || (isPaid ? 'processing' : 'pending'),
      paymentStatus: p.paymentStatus || (isPaid ? 'verified' : 'initiated'),
      expectedSettlementDate: expDate
    };
  });

  return {
    monthlyEarnings,
    pendingSettlements,
    totalFeeCollected,
    completedSettlementsCount,
    recentSettlements: formattedSettlements
  };
}

/**
 * GET Notifications
 */
export async function getNotifications(tenant) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    return [
      {
        _id: 'n1',
        title: 'Rent Payment Captured',
        message: 'Adarsh Kumar has successfully paid ₹10,000 for July 2026 rent.',
        type: 'payment',
        read: false,
        createdAt: new Date().toISOString(),
        data: { amount: 10000, platformFee: 200, ownerAmount: 9800, residentName: 'Adarsh Kumar' }
      },
      {
        _id: 'n2',
        title: 'Settlement Initiated',
        message: 'Transfer of ₹9,800 initiated via Razorpay Route.',
        type: 'settlement',
        read: true,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  }

  return await Notification.find({ organizationId: tenant.organizationId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(tenant, notificationId) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    return { success: true };
  }
  await Notification.findOneAndUpdate(
    { _id: notificationId, organizationId: tenant.organizationId },
    { read: true }
  );
  return { success: true };
}

