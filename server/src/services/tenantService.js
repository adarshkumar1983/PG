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
import { MessMenu, MealSkip } from '../models/Mess.js';
import crypto from 'crypto';
import PaymentService from './paymentService.js';

const getAppUrl = () => {
  return process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
};

export function formatInvoicePeriodHelper(p) {
  if (!p) return '';
  if (p.stayPeriod && p.stayPeriod.startDate && p.stayPeriod.endDate) {
    const start = new Date(p.stayPeriod.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const end = new Date(p.stayPeriod.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `Daily Stay (${start} - ${end})`;
  }
  const monthStr = p.invoiceMonth || '';
  if (p.billingType === 'daily' || monthStr.includes('-DAILY-') || monthStr.includes('DAILY')) {
    const ym = monthStr.match(/^(\d{4})-(\d{2})/);
    if (ym) {
      const d = new Date(Number(ym[1]), Number(ym[2]) - 1, 1);
      return `Daily Stay (${d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})`;
    }
    return 'Daily Stay';
  }
  const m = monthStr.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  return monthStr.split('-DAILY-')[0] || monthStr;
}

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

      if (p.referenceNumber && p.status !== 'paid') {
        status = 'Pending Verification';
      }

      const dateStr = p.status === 'paid' && p.paidAt 
        ? `Paid ${new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : `Due for ${formatInvoicePeriodHelper(p)}`;

      return {
        _id: p._id,
        name: user?.name || 'You',
        room: `Room ${roomNumber} · ${bedLabel}`,
        amount: p.amount,
        status,
        rawStatus: p.status,
        date: dateStr,
        initials: user?.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U',
        color: '#17644f',
        referenceNumber: p.referenceNumber,
        method: p.method
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
      directSettlementEnabled: org 
        ? (org.gateway?.provider === 'cashfree' ? false : org.directSettlementEnabled !== false)
        : true,
      onlineGatewayEnabled: org ? org.onlineGatewayEnabled !== false : true,
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
      : `Due for ${formatInvoicePeriodHelper(p)}`;

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
    const inviteLink = `${getAppUrl()}/accept-invite?token=${inviteToken}`;
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
    const isDaily = data.stayType === 'daily';
    const checkIn = data.checkInDate ? new Date(data.checkInDate) : new Date();
    const checkOut = data.checkOutDate ? new Date(data.checkOutDate) : undefined;
    
    let computedDays = 1;
    if (isDaily && checkIn && checkOut) {
      const ms = checkOut.getTime() - checkIn.getTime();
      computedDays = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    } else if (data.totalDays) {
      computedDays = Number(data.totalDays);
    }

    const resident = await Resident.create({
      organizationId: tenant.organizationId,
      propertyId,
      roomId,
      bedId,
      userId: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      checkInDate: checkIn,
      stayType: isDaily ? 'daily' : 'monthly',
      dailyRate: isDaily ? Number(data.dailyRate || 0) : undefined,
      expectedCheckOutDate: isDaily ? checkOut : undefined,
      totalDays: isDaily ? computedDays : undefined,
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
            if (isDaily) {
              const rate = Number(data.dailyRate) || bedDoc.dailyRent || Math.round(bedDoc.monthlyRent / 30);
              rentAmount = rate * computedDays;
              resident.dailyRate = rate;
              await resident.save();
            } else {
              rentAmount = bedDoc.monthlyRent;
            }
          }
        }
      }
    } else if (isDaily) {
      const rate = Number(data.dailyRate) || 500;
      rentAmount = rate * computedDays;
      resident.dailyRate = rate;
      await resident.save();
    }

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const invoiceMonthStr = isDaily ? `${currentMonthStr}-DAILY-${resident._id}` : currentMonthStr;

    // Auto raise first rent invoice for the resident
    const paymentRecord = new Payment({
      organizationId: tenant.organizationId,
      propertyId,
      residentId: resident._id,
      invoiceMonth: invoiceMonthStr,
      billingType: isDaily ? 'daily' : 'monthly',
      stayPeriod: isDaily ? { startDate: checkIn, endDate: checkOut, totalDays: computedDays } : undefined,
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
  const inviteLink = `${getAppUrl()}/accept-invite?token=${inviteToken}`;

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
  const { role, propertyId, roomId, bedId, email } = data;
  if (!['owner', 'staff', 'resident'].includes(role)) {
    const err = new Error('A valid role is required.');
    err.status = 400;
    throw err;
  }

  if (!isDbConnected()) {
    const updated = mockStore.updateMockMemberRole(id, role, propertyId, roomId, bedId, email);
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

  if (email && email.trim() !== '') {
    if (membership.status !== 'invited') {
      const err = new Error('Cannot edit email address of a registered user.');
      err.status = 400;
      throw err;
    }

    const newEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      const existingMembership = await Membership.findOne({ 
        organizationId: tenant.organizationId, 
        userId: existingUser.id 
      });
      if (existingMembership && existingMembership._id.toString() !== id) {
        const err = new Error('This email address is already registered in this property.');
        err.status = 400;
        throw err;
      }
    }

    const userToUpdate = await User.findById(membership.userId);
    if (userToUpdate) {
      userToUpdate.email = newEmail;
      await userToUpdate.save();
    }

    const residentToUpdate = await Resident.findOne({ organizationId: tenant.organizationId, userId: membership.userId });
    if (residentToUpdate) {
      residentToUpdate.email = newEmail;
      await residentToUpdate.save();
    }
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
    const inviteLink = `${getAppUrl()}/accept-invite?token=${inviteToken}`;
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
  const inviteLink = `${getAppUrl()}/accept-invite?token=${inviteToken}`;

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
    mockPay.provider = 'cashfree';
    return {
      keyId: 'cf_mock_app_id',
      orderId: mockOrderId,
      paymentSessionId: 'session_mock_' + Math.random().toString(36).substr(2, 20),
      amount: outstanding,
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

  // Fetch organization profile to get linkedAccountId and provider setting
  const org = await Organization.findById(tenant.organizationId).lean();
  if (org && org.onlineGatewayEnabled === false) {
    throw new Error('Instant online checkout is currently disabled by the property owner.');
  }

  const resident = await Resident.findById(payment.residentId).lean();
  if (!resident) {
    throw new Error('Associated resident profile not found.');
  }

  const orderInfo = await PaymentService.createOrder(org, payment, outstanding, resident);
  
  payment.gatewayOrderId = orderInfo.orderId;
  payment.provider = org.gateway?.provider || 'none';
  await payment.save();

  return orderInfo;
}

export async function verifyOnlinePayment(tenant, auth, payload) {
  const { paymentId } = payload;

  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    // Mock validation
    const mockPay = mockStore.mockPayments.find(p => p.gatewayOrderId === payload.order_id || p.gatewayOrderId === payload.razorpay_order_id || p._id === paymentId);
    if (!mockPay) {
      throw new Error('Mock payment not found.');
    }
    const outstanding = mockPay.amount - (mockPay.receivedAmount || 0);
    mockPay.status = 'paid';
    mockPay.receivedAmount = mockPay.amount;
    mockPay.method = 'online_gateway';
    mockPay.gatewayPaymentId = payload.cf_payment_id || payload.razorpay_payment_id || 'pay_mock_success';
    mockPay.paidAt = new Date().toISOString();
    mockPay.transactions.push({
      amount: outstanding,
      paidAt: new Date().toISOString(),
      method: 'online_gateway',
      referenceNumber: payload.cf_payment_id || payload.razorpay_payment_id || 'pay_mock_success',
      notes: `Paid online via ${mockPay.provider || 'gateway'} (Mock)`
    });
    return { success: true, message: 'Mock payment verified successfully.', payment: mockPay };
  }

  // Real DB flow
  const queryOr = [];
  if (payload.order_id) queryOr.push({ gatewayOrderId: payload.order_id });
  if (payload.razorpay_order_id) queryOr.push({ gatewayOrderId: payload.razorpay_order_id });
  if (paymentId) queryOr.push({ _id: paymentId });

  if (queryOr.length === 0) {
    throw new Error('No valid payment identifiers provided.');
  }

  const payment = await Payment.findOne({
    $or: queryOr,
    organizationId: tenant.organizationId
  });
  if (!payment) {
    throw new Error('Payment invoice not found.');
  }

  const org = await Organization.findById(tenant.organizationId).lean();
  if (!org) {
    throw new Error('Organization not found.');
  }

  const result = await PaymentService.verifyPayment(org, payload, payment);

  const outstanding = payment.amount - (payment.receivedAmount || 0);
  if (outstanding > 0) {
    const paymentRef = result.cf_payment_id || payload.razorpay_payment_id || 'simulated_txn_' + Date.now();
    const transactionExists = payment.transactions.some(tx => tx.referenceNumber === paymentRef);
    if (!transactionExists) {
      payment.transactions.push({
        amount: outstanding,
        paidAt: new Date(),
        method: 'online_gateway',
        referenceNumber: paymentRef,
        notes: `Paid online via ${org.gateway?.provider || 'gateway'}`
      });
      payment.receivedAmount = payment.amount;
      payment.status = 'paid';
      payment.method = 'online_gateway';
      payment.gatewayPaymentId = paymentRef;
      payment.paidAt = new Date();
      payment.provider = org.gateway?.provider || 'none';
      payment.providerStatus = 'PAID';
      payment.rawProviderReference = result.raw || null;
      payment.history.push({
        action: 'payment_recorded',
        timestamp: new Date(),
        details: { amount: outstanding, method: 'online_gateway', referenceNumber: paymentRef }
      });
      await payment.save();
    }
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
      gatewayProvider: 'razorpay',
      upiId: 'owner@okaxis',
      directSettlementEnabled: true,
      onlineGatewayEnabled: true,
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
    gatewayProvider: org.gateway?.provider || 'none',
    upiId: org.upiId || '',
    directSettlementEnabled: org.directSettlementEnabled !== false,
    onlineGatewayEnabled: org.onlineGatewayEnabled !== false,
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

  // Server-side format validations
  if (data.upiId) {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(data.upiId)) {
      throw new Error('Invalid UPI ID format. Standard format: staying@okaxis');
    }
  }

  if (data.bankDetails) {
    if (data.bankDetails.ifscCode) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(data.bankDetails.ifscCode)) {
        throw new Error('Invalid IFSC Code format. Code must be 11 characters, e.g. HDFC0000123');
      }
    }
    if (data.bankDetails.accountNumber) {
      const accNumRegex = /^\d{9,18}$/;
      if (!accNumRegex.test(data.bankDetails.accountNumber)) {
        throw new Error('Invalid Account Number. Must be digits only and length between 9 and 18.');
      }
    }
  }

  const provider = data.gatewayProvider !== undefined ? data.gatewayProvider : (org.gateway?.provider || 'none');

  if (data.linkedAccountId) {
    if (provider === 'razorpay') {
      const linkedAccRegex = /^acc_[a-zA-Z0-9]{14}$/;
      if (!linkedAccRegex.test(data.linkedAccountId)) {
        throw new Error('Invalid Razorpay Linked Account ID. Must start with "acc_" followed by exactly 14 characters (18 characters total).');
      }
    } else if (provider === 'cashfree') {
      const cfVendorRegex = /^[a-zA-Z0-9_-]{1,40}$/;
      if (!cfVendorRegex.test(data.linkedAccountId)) {
        throw new Error('Invalid Cashfree Vendor ID. Must be alphanumeric (1-40 chars), optionally containing underscores or hyphens.');
      }
    }
  }

  // Update fields
  if (data.name) org.name = data.name;
  if (data.upiId !== undefined) org.upiId = data.upiId;
  if (data.directSettlementEnabled !== undefined) org.directSettlementEnabled = data.directSettlementEnabled;
  if (data.onlineGatewayEnabled !== undefined) org.onlineGatewayEnabled = data.onlineGatewayEnabled;
  
  if (data.linkedAccountId !== undefined || data.gatewayProvider !== undefined) {
    org.gateway = {
      ...org.gateway,
      linkedAccountId: data.linkedAccountId !== undefined ? data.linkedAccountId : org.gateway.linkedAccountId,
      provider: data.gatewayProvider !== undefined ? data.gatewayProvider : (data.linkedAccountId ? 'razorpay' : 'none')
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
    details: { name: org.name, upiId: org.upiId, linkedAccountId: org.gateway?.linkedAccountId, directSettlementEnabled: org.directSettlementEnabled, onlineGatewayEnabled: org.onlineGatewayEnabled }
  });

  return {
    _id: org._id,
    name: org.name,
    slug: org.slug,
    linkedAccountId: org.gateway?.linkedAccountId || '',
    gatewayProvider: org.gateway?.provider || 'none',
    upiId: org.upiId || '',
    directSettlementEnabled: org.directSettlementEnabled !== false,
    onlineGatewayEnabled: org.onlineGatewayEnabled !== false,
    bankDetails: org.bankDetails
  };
}

/**
 * POST / Verify Bank Account Details using IMPS Penny Drop
 */
export async function verifyBankAccount(tenant, data) {
  const { accountName, accountNumber, ifscCode } = data;
  if (!accountName || !accountNumber || !ifscCode) {
    throw new Error('Account Name, Account Number, and IFSC Code are required.');
  }

  // Formats Check
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(ifscCode)) {
    throw new Error('Invalid IFSC Code format.');
  }

  const accNumRegex = /^\d{9,18}$/;
  if (!accNumRegex.test(accountNumber)) {
    throw new Error('Account Number must be between 9 and 18 digits.');
  }

  // Check if Razorpay keys are configured and are LIVE keys
  const rzpKeyId = process.env.RAZORPAY_KEY_ID;
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const isLiveKey = rzpKeyId && rzpKeyId.startsWith('rzp_live');

  const { evaluateNameMatch } = await import('../utils/nameMatcher.js');

  if (!isLiveKey || !rzpKeySecret || tenant.organizationId === 'demo-org' || !isDbConnected()) {
    // Simulated Penny Drop (fallback for dev environment/demo mode)
    const inputNameUpper = accountName.toUpperCase().trim();
    let mockRegisteredName = inputNameUpper;
    
    if (inputNameUpper.includes('STAYZEN')) {
      mockRegisteredName = 'STAYZEN REALTY PRIVATE LIMITED';
    } else if (inputNameUpper.includes('ARJUN')) {
      mockRegisteredName = 'ARJUN MEHTA';
    } else {
      mockRegisteredName = 'MR. ' + inputNameUpper;
    }

    const evaluation = evaluateNameMatch(accountName, mockRegisteredName);

    return {
      success: true,
      isMock: true,
      registeredName: mockRegisteredName,
      score: evaluation.score,
      matched: evaluation.matched,
      text: evaluation.text,
      color: evaluation.color,
      bankRef: 'IMPSRef_' + Math.random().toString(36).substr(2, 9).toUpperCase()
    };
  }

  // Live Razorpay Penny Drop (Composite Account Validation)
  try {
    const payload = {
      account_number: accountNumber,
      validation_type: 'optimized',
      reference_id: 'val_' + Math.random().toString(36).substr(2, 9),
      fund_account: {
        account_type: 'bank_account',
        bank_account: {
          name: accountName,
          ifsc: ifscCode,
          account_number: accountNumber
        },
        contact: {
          name: accountName,
          type: 'vendor'
        }
      }
    };

    const authHeader = 'Basic ' + Buffer.from(rzpKeyId + ':' + rzpKeySecret).toString('base64');
    
    const response = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.description || 'Razorpay bank validation failed.');
    }

    const registeredName = result.results?.registered_name || result.fund_account?.bank_account?.name || '';
    const status = result.status;

    if (status === 'failed') {
      throw new Error(result.failure_reason || 'Penny drop validation rejected by the destination bank.');
    }

    const evaluation = evaluateNameMatch(accountName, registeredName);

    return {
      success: true,
      isMock: false,
      registeredName: registeredName,
      score: evaluation.score,
      matched: evaluation.matched,
      text: evaluation.text,
      color: evaluation.color,
      bankRef: result.id
    };
  } catch (error) {
    throw new Error('Bank verification error: ' + error.message);
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
export async function getNotifications(tenant, auth) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    if (tenant.role === 'resident') {
      return [
        {
          _id: 'n1',
          title: 'Rent Receipt Issued',
          message: 'Your rent payment receipt has been issued and verified.',
          type: 'payment',
          read: false,
          createdAt: new Date().toISOString()
        }
      ];
    }
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

  const query = { organizationId: tenant.organizationId };

  if (tenant.role === 'resident' && auth?.sub) {
    const resident = await Resident.findOne({ organizationId: tenant.organizationId, userId: auth.sub }).lean();
    query.$or = [
      { userId: new mongoose.Types.ObjectId(auth.sub) },
      { 'data.residentUserId': auth.sub },
      ...(resident ? [{ 'data.residentId': resident._id }] : [])
    ];
  }

  return await Notification.find(query)
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

/**
 * Report offline payment (UPI QR / Bank Transfer)
 */
export async function reportOfflinePayment(tenant, auth, paymentId, data) {
  const { method, referenceNumber, notes, screenshot, amount } = data;
  if (!method || !referenceNumber) {
    throw new Error('Payment method and transaction reference number are required.');
  }

  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    const payment = mockStore.reportMockOfflinePayment(paymentId, data);
    return { success: true, message: 'Offline payment reported successfully (Demo Mode).', payment };
  }

  // Find payment and verify it belongs to this organization
  const payment = await Payment.findOne({ _id: paymentId, organizationId: tenant.organizationId });
  if (!payment) {
    throw new Error('Payment invoice not found.');
  }

  // Ensure the resident is the one who owns this payment or caller is staff/owner
  const user = await User.findById(auth.sub).lean();
  let residentName = user?.name || 'Resident';
  if (tenant.role === 'resident') {
    const resident = await Resident.findOne({ organizationId: tenant.organizationId, userId: auth.sub }).lean();
    if (!resident || resident._id.toString() !== payment.residentId.toString()) {
      throw new Error('You are not authorized to report payment for this resident.');
    }
    residentName = resident.name;
  }

  if (payment.status === 'paid') {
    throw new Error('This invoice has already been fully paid.');
  }

  payment.status = 'pending'; // Mark as pending verification
  payment.method = method;
  payment.referenceNumber = referenceNumber;
  payment.reportedAmount = amount !== undefined ? Number(amount) : payment.amount;
  payment.notes = notes || '';
  if (screenshot) {
    payment.screenshot = screenshot;
  }
  
  if (!payment.history) payment.history = [];
  payment.history.push({
    action: 'offline_payment_reported',
    performedBy: auth.sub,
    timestamp: new Date(),
    details: { method, referenceNumber, notes }
  });

  await payment.save();

  // Create notification for the organization owners/staff
  await Notification.create({
    organizationId: tenant.organizationId,
    title: 'Offline Payment Reported',
    message: `${residentName} reported a payment of ₹${payment.amount} via ${method.toUpperCase()} (Ref: ${referenceNumber}).`,
    type: 'payment',
    read: false,
    data: { paymentId: payment._id, amount: payment.amount, referenceNumber, residentName, residentUserId: auth.sub, residentId: payment.residentId }
  });

  return { success: true, message: 'Offline payment reported successfully for verification.', payment };
}

/**
 * Approve reported offline payment
 */
export async function approveOfflinePayment(tenant, auth, paymentId) {
  if (tenant.organizationId === 'demo-org' || !isDbConnected()) {
    const payment = mockStore.approveMockOfflinePayment(paymentId, auth.sub);
    return { success: true, message: 'Offline payment approved successfully (Demo Mode).', payment };
  }

  const payment = await Payment.findOne({ _id: paymentId, organizationId: tenant.organizationId })
    .populate('residentId', 'name email');
  if (!payment) {
    throw new Error('Payment record not found.');
  }

  if (payment.status === 'paid') {
    throw new Error('Payment is already marked as paid.');
  }

  // Calculate approval amount based on what resident reported
  const currentReceived = payment.receivedAmount || 0;
  const approveAmount = payment.reportedAmount !== undefined ? payment.reportedAmount : (payment.amount - currentReceived);
  const totalReceived = currentReceived + approveAmount;
  
  payment.receivedAmount = Math.min(totalReceived, payment.amount);
  payment.status = payment.receivedAmount >= payment.amount ? 'paid' : 'partially_paid';
  payment.paidAt = new Date();
  payment.method = payment.method || 'upi';
  payment.referenceNumber = payment.referenceNumber || 'DIRECT_APPROVE';
  
  if (!payment.transactions) payment.transactions = [];
  payment.transactions.push({
    amount: approveAmount,
    paidAt: new Date(),
    method: payment.method || 'upi',
    referenceNumber: payment.referenceNumber || 'DIRECT_APPROVE',
    notes: payment.notes || 'Offline payment verified and approved.',
    recordedBy: auth.sub
  });

  if (!payment.history) payment.history = [];
  payment.history.push({
    action: 'offline_payment_approved',
    performedBy: auth.sub,
    timestamp: new Date(),
    details: { amount: approveAmount }
  });

  await payment.save();

  // Fetch organization profile to get name for email
  const org = await Organization.findById(tenant.organizationId).lean();
  const organizationName = org ? org.name : 'StayZen Residency';

  // Send email confirmation receipt to resident
  if (payment.residentId && payment.residentId.email) {
    try {
      const { sendReceiptEmail } = await import('../utils/mailer.js');
      await sendReceiptEmail(payment.residentId.email, payment.residentId.name, {
        amount: approveAmount,
        purpose: payment.purpose,
        invoiceMonth: payment.invoiceMonth,
        method: payment.method,
        referenceNumber: payment.referenceNumber,
        paidAt: payment.paidAt,
        organizationName
      });
    } catch (mailErr) {
      console.error('[SMTP ERROR] Failed to send payment receipt email:', mailErr);
    }
  }

  // Add audit log
  await AuditLog.create({
    organizationId: tenant.organizationId,
    performedBy: auth.sub,
    action: 'record_payment',
    entityType: 'Payment',
    entityId: payment._id,
    details: {
      amount: approveAmount,
      purpose: payment.purpose,
      invoiceMonth: payment.invoiceMonth,
      method: payment.method || 'upi',
      residentName: payment.residentId?.name || 'Resident',
      newValue: { status: payment.status, receivedAmount: payment.receivedAmount }
    }
  });

  return { success: true, message: 'Payment successfully approved and recorded in ledger.', payment };
}

export async function getMessMenu(organizationId, propertyId) {
  if (!isDbConnected() || organizationId === 'demo-org' || !organizationId) {
    return mockStore.getMockMessMenu(propertyId);
  }
  try {
    const menus = await MessMenu.find({ organizationId, propertyId }).lean();
    if (!menus || menus.length === 0) {
      return mockStore.getMockMessMenu(propertyId);
    }
    return menus;
  } catch (err) {
    return mockStore.getMockMessMenu(propertyId);
  }
}

export async function updateMessMenu(organizationId, propertyId, dayOfWeek, menuItems) {
  if (!isDbConnected() || organizationId === 'demo-org' || !organizationId) {
    return mockStore.updateMockMessMenu(propertyId, dayOfWeek, menuItems);
  }
  try {
    let menu = await MessMenu.findOne({ organizationId, propertyId, dayOfWeek });
    if (menu) {
      if (menuItems.breakfast) menu.breakfast = menuItems.breakfast;
      if (menuItems.lunch) menu.lunch = menuItems.lunch;
      if (menuItems.snacks) menu.snacks = menuItems.snacks;
      if (menuItems.dinner) menu.dinner = menuItems.dinner;
      await menu.save();
      return menu;
    } else {
      menu = await MessMenu.create({
        organizationId,
        propertyId,
        dayOfWeek,
        breakfast: menuItems.breakfast || { items: '', timing: '08:00 AM - 10:00 AM' },
        lunch: menuItems.lunch || { items: '', timing: '01:00 PM - 03:00 PM' },
        snacks: menuItems.snacks || { items: '', timing: '05:30 PM - 06:30 PM' },
        dinner: menuItems.dinner || { items: '', timing: '08:00 PM - 10:00 PM' }
      });
      return menu;
    }
  } catch (err) {
    return mockStore.updateMockMessMenu(propertyId, dayOfWeek, menuItems);
  }
}

export async function getMealSkips(organizationId, propertyId, date) {
  if (!isDbConnected() || organizationId === 'demo-org' || !organizationId) {
    return mockStore.getMockMealSkips(propertyId, date);
  }
  try {
    const filter = { organizationId, propertyId };
    if (date) filter.date = date;
    return await MealSkip.find(filter).sort({ createdAt: -1 }).lean();
  } catch (err) {
    return mockStore.getMockMealSkips(propertyId, date);
  }
}

export async function toggleMealSkip(organizationId, propertyId, skipData) {
  if (!isDbConnected() || organizationId === 'demo-org' || !organizationId) {
    return mockStore.toggleMockMealSkip(propertyId, skipData);
  }
  try {
    const { residentId, residentName, roomNumber, date, meals, reason } = skipData;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let existing = await MealSkip.findOne({ organizationId, propertyId, residentId, date: targetDate });

    if (existing) {
      if (!meals || meals.length === 0) {
        await MealSkip.deleteOne({ _id: existing._id });
        return { message: 'Meal skip cancelled', skip: null };
      }
      existing.meals = meals;
      if (reason) existing.reason = reason;
      await existing.save();
      return { message: 'Meal skip updated', skip: existing };
    } else {
      if (!meals || meals.length === 0) return { message: 'No meals specified', skip: null };
      const skip = await MealSkip.create({
        organizationId,
        propertyId,
        residentId,
        residentName: residentName || 'Resident',
        roomNumber: roomNumber || 'N/A',
        date: targetDate,
        meals,
        reason: reason || 'Out of PG',
        status: 'approved'
      });
      return { message: 'Meal skip logged successfully', skip };
    }
  } catch (err) {
    return mockStore.toggleMockMealSkip(propertyId, skipData);
  }
}



