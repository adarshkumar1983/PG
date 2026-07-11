import crypto from 'crypto';

export let mockProperties = [
  {
    _id: 'demo-prop-1',
    organizationId: 'demo-org',
    name: 'Greenview Residency',
    address: '123 Leafy Lane, Sector 4, HSR Layout, Bengaluru',
    contactNumber: '+91 98765 43210',
    gstNumber: '29ABCDE1234F1Z5',
    amenities: ['Wi-Fi', 'Power backup', 'CCTV', 'AC', 'Housekeeping'],
    photos: [],
    maintenanceEnabled: true,
    maintenanceAmount: 1500,
    maintenanceFrequency: '3_months',
    maintenanceCustomMonths: 1,
    maintenanceNextDueDate: new Date('2026-06-01T00:00:00.000Z'),
    maintenanceSeparateInvoice: false,
    rooms: [
      {
        _id: 'room-101',
        number: '101',
        floor: '1',
        category: 'AC Single',
        acType: 'ac',
        sharingType: 'single',
        beds: [
          { _id: 'bed-101-1', label: 'Bed A', monthlyRent: 12000, status: 'occupied', residentId: 'res-1' }
        ]
      },
      {
        _id: 'room-102',
        number: '102',
        floor: '1',
        category: 'AC Double',
        acType: 'ac',
        sharingType: 'double',
        beds: [
          { _id: 'bed-102-1', label: 'Bed A', monthlyRent: 9000, status: 'occupied', residentId: 'res-2' },
          { _id: 'bed-102-2', label: 'Bed B', monthlyRent: 9000, status: 'vacant' }
        ]
      },
      {
        _id: 'room-103',
        number: '103',
        floor: '1',
        category: 'Non-AC Double',
        acType: 'non-ac',
        sharingType: 'double',
        beds: [
          { _id: 'bed-103-1', label: 'Bed A', monthlyRent: 7500, status: 'occupied', residentId: 'res-3' },
          { _id: 'bed-103-2', label: 'Bed B', monthlyRent: 7500, status: 'occupied', residentId: 'res-4' }
        ]
      },
      {
        _id: 'room-201',
        number: '201',
        floor: '2',
        category: 'Non-AC Triple',
        acType: 'non-ac',
        sharingType: 'triple',
        beds: [
          { _id: 'bed-201-1', label: 'Bed A', monthlyRent: 6000, status: 'occupied', residentId: 'res-5' },
          { _id: 'bed-201-2', label: 'Bed B', monthlyRent: 6000, status: 'vacant' },
          { _id: 'bed-201-3', label: 'Bed C', monthlyRent: 6000, status: 'vacant' }
        ]
      },
      {
        _id: 'room-202',
        number: '202',
        floor: '2',
        category: 'AC Triple',
        acType: 'ac',
        sharingType: 'triple',
        beds: [
          { _id: 'bed-202-1', label: 'Bed A', monthlyRent: 7500, status: 'occupied', residentId: 'res-6' },
          { _id: 'bed-202-2', label: 'Bed B', monthlyRent: 7500, status: 'occupied', residentId: 'res-7' },
          { _id: 'bed-202-3', label: 'Bed C', monthlyRent: 7500, status: 'maintenance' }
        ]
      }
    ]
  }
];

export let mockResidents = [
  { _id: 'res-1', name: 'Arjun Mehta', mobile: '+91 90000 11223', email: 'arjun@example.com', propertyId: 'demo-prop-1', roomId: 'room-101', bedId: 'bed-101-1', checkInDate: '2026-01-15', status: 'active' },
  { _id: 'res-2', name: 'Nikhil Sharma', mobile: '+91 99887 76655', email: 'nikhil@example.com', propertyId: 'demo-prop-1', roomId: 'room-102', bedId: 'bed-102-1', checkInDate: '2026-02-10', status: 'active' },
  { _id: 'res-3', name: 'Rahul Verma', mobile: '+91 98765 43210', email: 'rahul@example.com', propertyId: 'demo-prop-1', roomId: 'room-103', bedId: 'bed-103-1', checkInDate: '2026-03-01', status: 'active' },
  { _id: 'res-4', name: 'Kabir Khan', mobile: '+91 97777 88888', email: 'kabir@example.com', propertyId: 'demo-prop-1', roomId: 'room-103', bedId: 'bed-103-2', checkInDate: '2026-03-15', status: 'active' },
  { _id: 'res-5', name: 'Aman Gupta', mobile: '+91 96666 55555', email: 'aman@example.com', propertyId: 'demo-prop-1', roomId: 'room-201', bedId: 'bed-201-1', checkInDate: '2026-04-01', status: 'active' },
  { _id: 'res-6', name: 'Rohan Singh', mobile: '+91 95555 44444', email: 'rohan@example.com', propertyId: 'demo-prop-1', roomId: 'room-202', bedId: 'bed-202-1', checkInDate: '2026-04-15', status: 'active' },
  { _id: 'res-7', name: 'Siddharth Roy', mobile: '+91 94444 33333', email: 'siddharth@example.com', propertyId: 'demo-prop-1', roomId: 'room-202', bedId: 'bed-202-2', checkInDate: '2026-05-01', status: 'active' }
];

export let mockExpenses = [
  { _id: 'exp-1', organizationId: 'demo-org', category: 'electricity', amount: 4500, occurredAt: '2026-06-01', note: 'May bill', recordedBy: 'demo-owner', createdAt: '2026-06-01T10:00:00Z' },
  { _id: 'exp-2', organizationId: 'demo-org', category: 'wifi', amount: 1200, occurredAt: '2026-06-02', note: 'ACT Fiber', recordedBy: 'demo-owner', createdAt: '2026-06-02T12:00:00Z' }
];

export let mockAuditLogs = [
  {
    _id: 'audit-1',
    performedBy: { name: 'Adarsh Kumar', email: 'owner@stayzen.demo' },
    action: 'record_payment',
    entityType: 'Payment',
    entityId: 'pay-mock-3',
    details: { amount: 7500, purpose: 'rent', invoiceMonth: '2026-06', method: 'cash', residentName: 'Rahul Verma' },
    createdAt: new Date('2026-06-03T10:00:00Z')
  }
];

export let mockPayments = [
  {
    _id: 'pay-mock-1',
    organizationId: 'demo-org',
    propertyId: { _id: 'demo-prop-1', name: 'Greenview Residency' },
    residentId: { _id: 'res-1', name: 'Arjun Mehta', mobile: '+91 90000 11223', email: 'arjun@example.com', roomId: 'room-101', bedId: 'bed-101-1' },
    invoiceMonth: '2026-06',
    purpose: 'rent',
    amount: 12000,
    receivedAmount: 0,
    status: 'due',
    transactions: [],
    history: []
  },
  {
    _id: 'pay-mock-2',
    organizationId: 'demo-org',
    propertyId: { _id: 'demo-prop-1', name: 'Greenview Residency' },
    residentId: { _id: 'res-2', name: 'Nikhil Sharma', mobile: '+91 99887 76655', email: 'nikhil@example.com', roomId: 'room-102', bedId: 'bed-102-1' },
    invoiceMonth: '2026-06',
    purpose: 'rent',
    amount: 9000,
    receivedAmount: 0,
    status: 'pending',
    transactions: [],
    history: []
  },
  {
    _id: 'pay-mock-3',
    organizationId: 'demo-org',
    propertyId: { _id: 'demo-prop-1', name: 'Greenview Residency' },
    residentId: { _id: 'res-3', name: 'Rahul Verma', mobile: '+91 98765 43210', email: 'rahul@example.com', roomId: 'room-103', bedId: 'bed-103-1' },
    invoiceMonth: '2026-06',
    purpose: 'rent',
    amount: 7500,
    receivedAmount: 7500,
    status: 'paid',
    method: 'cash',
    paidAt: new Date('2026-06-03T11:00:00Z'),
    transactions: [
      { amount: 7500, paidAt: new Date('2026-06-03T11:00:00Z'), method: 'cash', referenceNumber: 'REC-123', notes: 'Paid full cash' }
    ],
    history: []
  },
  {
    _id: 'pay-mock-4',
    organizationId: 'demo-org',
    propertyId: { _id: 'demo-prop-1', name: 'Greenview Residency' },
    residentId: { _id: 'res-4', name: 'Kabir Khan', mobile: '+91 97777 88888', email: 'kabir@example.com', roomId: 'room-103', bedId: 'bed-103-2' },
    invoiceMonth: '2026-06',
    purpose: 'rent',
    amount: 7500,
    receivedAmount: 7500,
    status: 'paid',
    method: 'upi',
    paidAt: new Date('2026-06-02T15:30:00Z'),
    transactions: [
      { amount: 7500, paidAt: new Date('2026-06-02T15:30:00Z'), method: 'upi', referenceNumber: 'UPI987654' }
    ],
    history: []
  },
  {
    _id: 'pay-mock-m1',
    organizationId: 'demo-org',
    propertyId: { _id: 'demo-prop-1', name: 'Greenview Residency' },
    residentId: { _id: 'res-1', name: 'Arjun Mehta', mobile: '+91 90000 11223', email: 'arjun@example.com', roomId: 'room-101', bedId: 'bed-101-1' },
    invoiceMonth: '2026-06',
    purpose: 'maintenance',
    amount: 1500,
    receivedAmount: 0,
    status: 'due',
    notes: 'Maintenance charge: Deep Cleaning',
    transactions: [],
    history: []
  },
  {
    _id: 'pay-mock-m2',
    organizationId: 'demo-org',
    propertyId: { _id: 'demo-prop-1', name: 'Greenview Residency' },
    residentId: { _id: 'res-2', name: 'Nikhil Sharma', mobile: '+91 99887 76655', email: 'nikhil@example.com', roomId: 'room-102', bedId: 'bed-102-1' },
    invoiceMonth: '2026-06',
    purpose: 'maintenance',
    amount: 500,
    receivedAmount: 500,
    status: 'paid',
    method: 'upi',
    paidAt: new Date('2026-06-05T12:00:00Z'),
    notes: 'Maintenance charge: Water Charge',
    transactions: [
      { amount: 500, paidAt: new Date('2026-06-05T12:00:00Z'), method: 'upi', referenceNumber: 'TXNWTR12' }
    ],
    history: []
  }
];

export const getDashboardStats = () => {
  const totalBeds = mockProperties.reduce((acc, p) => acc + p.rooms.reduce((rAcc, r) => rAcc + r.beds.length, 0), 0);
  const occupiedBeds = mockProperties.reduce((acc, p) => acc + p.rooms.reduce((rAcc, r) => rAcc + r.beds.filter(b => b.status === 'occupied').length, 0), 0);
  const vacantBeds = totalBeds - occupiedBeds;
  const residentsCount = mockResidents.length;

  let collected = 0;
  let pending = 0;
  mockPayments.forEach(p => {
    collected += p.receivedAmount || 0;
    if (['due', 'pending', 'partially_paid'].includes(p.status)) {
      pending += Math.max(0, p.amount - p.receivedAmount);
    }
  });

  const formattedPayments = mockPayments.map(p => {
    const resName = p.residentId?.name || p.name || 'Resident';
    const initials = resName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const colors = ['#efb36f', '#7ab4aa', '#8ca4d8', '#c196d2', '#d97b7b'];
    const charCodeSum = resName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const color = colors[charCodeSum % colors.length];
    
    let status = 'Paid';
    if (p.status === 'due') status = 'Overdue';
    else if (p.status === 'pending') status = 'Due soon';
    else if (p.status === 'partially_paid') status = 'Partially Paid';
    
    const dateStr = p.status === 'paid' && p.paidAt 
      ? `Paid ${new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      : `Due for ${p.invoiceMonth}`;

    let roomLabel = 'General';
    if (p.residentId) {
      const resIdStr = p.residentId._id;
      const residentObj = mockResidents.find(r => r._id === resIdStr);
      if (residentObj) {
        const prop = mockProperties.find(pr => pr._id === residentObj.propertyId);
        if (prop) {
          const room = prop.rooms.find(rm => rm._id === residentObj.roomId);
          if (room) {
            const bed = room.beds.find(bd => bd._id === residentObj.bedId);
            roomLabel = `${room.number} · ${bed ? bed.label : 'Bed'}`;
          }
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
      color,
      method: p.method || 'cash'
    };
  });

  const overduePaymentsCount = mockPayments.filter(p => p.status === 'due').length;

  // Mock maintenance calculations
  let todaysMaintenanceCollections = 0;
  let pendingMaintenancePayments = 0;
  let totalMaintenanceRevenue = 0;

  const todayStr = new Date().toDateString();

  mockPayments.forEach(p => {
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

  mockProperties.forEach(prop => {
    if (prop.maintenanceEnabled && prop.maintenanceNextDueDate) {
      const dueDate = new Date(prop.maintenanceNextDueDate);
      if (!nextMaintenanceDueDate || dueDate < nextMaintenanceDueDate) {
        nextMaintenanceDueDate = dueDate;
      }
      const propResidentsCount = mockResidents.filter(r => r.propertyId === prop._id).length;
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
    property: mockProperties[0]?.name || 'Greenview Residency',
    owner: 'Adarsh',
    month: 'June 2026',
    stats: {
      residents: residentsCount,
      rooms: mockProperties.reduce((acc, p) => acc + p.rooms.length, 0),
      occupiedBeds,
      totalBeds,
      collected,
      pending
    },
    attention: [
      { id: 1, type: 'danger', icon: '₹', title: `${overduePaymentsCount} rent payments overdue`, meta: `₹${new Intl.NumberFormat('en-IN').format(pending)} outstanding`, action: 'Review dues' },
      { id: 2, type: 'warn', icon: '⌛', title: '4 agreements expiring', meta: 'Within the next 30 days', action: 'View residents' },
      { id: 3, type: 'info', icon: '▦', title: `${vacantBeds} beds are available`, meta: `Across ${mockProperties.reduce((acc, p) => acc + p.rooms.filter(r => r.beds.some(b => b.status === 'vacant')).length, 0)} rooms`, action: 'View inventory' }
    ],
    payments: formattedPayments
  };
};

export const updateMockProperty = (id, updatedBody) => {
  const idx = mockProperties.findIndex(p => p._id === id);
  if (idx === -1) return null;
  mockProperties[idx] = { ...mockProperties[idx], ...updatedBody };
  return mockProperties[idx];
};

export const addMockProperty = (body) => {
  const newProp = {
    _id: `demo-prop-${Date.now()}`,
    organizationId: 'demo-org',
    ...body
  };
  mockProperties.push(newProp);
  return newProp;
};

export const addMockResident = (body) => {
  const newRes = {
    _id: `res-${Date.now()}`,
    status: 'active',
    ...body
  };
  mockResidents.push(newRes);
  return newRes;
};

export let mockMembers = [
  { id: 'demo-owner', name: 'Adarsh Kumar', email: 'owner@stayzen.demo', mobile: '+91 98765 43210', role: 'owner', status: 'active' },
  { id: 'demo-staff', name: 'Rohan Singh', email: 'manager@greenview.demo', mobile: '+91 99887 76655', role: 'staff', status: 'active' },
  { id: 'demo-resident', name: 'Arjun Mehta', email: 'arjun@example.com', mobile: '+91 90000 11223', role: 'resident', status: 'invited' }
];

export const addMockMember = (body) => {
  const memberId = `demo-member-${Date.now()}`;
  const newMember = {
    id: memberId,
    status: 'invited',
    ...body
  };
  mockMembers.push(newMember);

  if (body.role === 'resident') {
    const resId = `res-${Date.now()}`;
    const newRes = {
      _id: resId,
      name: body.name,
      mobile: body.mobile,
      email: body.email,
      propertyId: body.propertyId,
      roomId: body.roomId,
      bedId: body.bedId,
      checkInDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      userId: memberId
    };
    mockResidents.push(newRes);

    // Update bed status & get rent amount
    let rentAmount = 8500;
    if (body.propertyId && body.roomId && body.bedId) {
      const prop = mockProperties.find(p => p._id === body.propertyId);
      const room = prop?.rooms?.find(r => r._id === body.roomId);
      const bed = room?.beds?.find(b => b._id === body.bedId);
      if (bed) {
        rentAmount = bed.monthlyRent;
        bed.status = 'occupied';
        bed.residentId = resId;
      }
    }

    const currentMonthStr = new Date().toISOString().slice(0, 7);

    // Auto-create invoice
    const paymentRecord = {
      _id: `pay-${Date.now()}`,
      organizationId: 'demo-org',
      propertyId: { _id: body.propertyId, name: 'Greenview Residency' },
      residentId: { _id: resId, name: body.name, mobile: body.mobile, email: body.email },
      invoiceMonth: currentMonthStr,
      purpose: 'rent',
      amount: rentAmount,
      receivedAmount: 0,
      status: 'due',
      transactions: [],
      history: []
    };

    if (body.recordInitialPayment && body.paymentAmount > 0) {
      const tDate = new Date();
      paymentRecord.transactions.push({
        _id: `tx-${Date.now()}`,
        amount: Number(body.paymentAmount),
        paidAt: tDate,
        method: body.paymentMethod || 'cash',
        referenceNumber: body.paymentRef || '',
        notes: body.paymentNotes || '',
        recordedBy: 'demo-owner'
      });

      paymentRecord.receivedAmount = Number(body.paymentAmount);
      paymentRecord.paidAt = tDate;
      paymentRecord.method = body.paymentMethod || 'cash';
      paymentRecord.referenceNumber = body.paymentRef || '';
      paymentRecord.notes = body.paymentNotes || '';
      paymentRecord.recordedBy = 'demo-owner';

      if (paymentRecord.receivedAmount >= paymentRecord.amount) {
        paymentRecord.status = 'paid';
      } else {
        paymentRecord.status = 'partially_paid';
      }

      paymentRecord.history.push({
        action: 'payment_recorded',
        performedBy: 'demo-owner',
        timestamp: tDate,
        details: { amount: body.paymentAmount, method: body.paymentMethod || 'cash', referenceNumber: body.paymentRef }
      });

      // Log audit
      mockAuditLogs.push({
        _id: `audit-${Date.now()}`,
        performedBy: { name: 'Adarsh Kumar', email: 'owner@stayzen.demo' },
        action: 'record_payment',
        entityType: 'Payment',
        entityId: paymentRecord._id,
        details: {
          amount: Number(body.paymentAmount),
          purpose: 'rent',
          invoiceMonth: currentMonthStr,
          method: body.paymentMethod || 'cash',
          residentName: body.name,
          newValue: { status: paymentRecord.status, receivedAmount: paymentRecord.receivedAmount }
        },
        createdAt: new Date()
      });
    }

    mockPayments.push(paymentRecord);
  }

  return newMember;
};

export const acceptMockInvite = (membershipId) => {
  const member = mockMembers.find(m => m.id === membershipId);
  if (member) {
    member.status = 'active';
    return member;
  }
  return null;
};

export const updateMockMemberRole = (id, role, propertyId, roomId, bedId) => {
  const member = mockMembers.find(m => m.id === id);
  if (member) {
    member.role = role;
    member.propertyId = propertyId;
    member.roomId = roomId;
    member.bedId = bedId;
    return member;
  }
  return null;
};

export const resendMockInvite = (id) => {
  const member = mockMembers.find(m => m.id === id);
  if (member) {
    member.status = 'invited';
    return member;
  }
  return null;
};

export const getMockPayments = (orgId) => {
  return mockPayments;
};

export const getMockExpenses = (orgId) => {
  return mockExpenses;
};

export const createMockExpense = (orgId, userId, data) => {
  const newExp = {
    _id: `exp-${Date.now()}`,
    organizationId: orgId,
    category: data.category,
    amount: Number(data.amount),
    occurredAt: data.occurredAt || new Date().toISOString(),
    note: data.note,
    recordedBy: userId,
    createdAt: new Date().toISOString()
  };
  mockExpenses.push(newExp);
  return newExp;
};

export const createMockInvoice = (orgId, data) => {
  const resident = mockResidents.find(r => r._id === data.residentId);
  const property = mockProperties.find(p => p._id === data.propertyId);

  const newInvoice = {
    _id: `pay-${Date.now()}`,
    organizationId: orgId,
    propertyId: { _id: data.propertyId, name: property?.name || 'Property' },
    residentId: { _id: data.residentId, name: resident?.name || 'Resident', mobile: resident?.mobile, email: resident?.email },
    invoiceMonth: data.invoiceMonth,
    purpose: data.purpose.toLowerCase(),
    amount: Number(data.amount),
    receivedAmount: 0,
    status: 'due',
    transactions: [],
    history: []
  };

  mockPayments.push(newInvoice);
  return newInvoice;
};

export const recordMockCashPayment = (orgId, userId, data) => {
  const { paymentId, residentId, invoiceMonth, purpose, amount, paidAt, referenceNumber, notes, propertyId } = data;
  let paymentRecord;
  if (paymentId) {
    paymentRecord = mockPayments.find(p => p._id === paymentId);
  } else {
    paymentRecord = mockPayments.find(p => p.residentId?._id === residentId && p.invoiceMonth === invoiceMonth && p.purpose === purpose.toLowerCase());
  }

  const resident = mockResidents.find(r => r._id === residentId);
  const property = mockProperties.find(p => p._id === (propertyId || resident?.propertyId));

  if (!paymentRecord) {
    paymentRecord = {
      _id: `pay-${Date.now()}`,
      organizationId: orgId,
      propertyId: { _id: property?._id, name: property?.name || 'Property' },
      residentId: { _id: residentId, name: resident?.name || 'Resident', mobile: resident?.mobile, email: resident?.email },
      invoiceMonth,
      purpose: purpose.toLowerCase(),
      amount: Number(amount),
      receivedAmount: 0,
      status: 'due',
      transactions: [],
      history: []
    };
    mockPayments.push(paymentRecord);
  }

  const remainingDue = paymentRecord.amount - paymentRecord.receivedAmount;
  if (amount > remainingDue && !data.allowOverpayment) {
    throw new Error(`Payment of ₹${amount} exceeds outstanding balance of ₹${remainingDue}.`);
  }

  const tDate = paidAt ? new Date(paidAt) : new Date();

  paymentRecord.transactions.push({
    _id: `tx-${Date.now()}`,
    amount: Number(amount),
    paidAt: tDate,
    method: 'cash',
    referenceNumber,
    notes,
    recordedBy: userId
  });

  paymentRecord.receivedAmount += Number(amount);
  paymentRecord.paidAt = tDate;
  paymentRecord.method = 'cash';
  paymentRecord.referenceNumber = referenceNumber;
  paymentRecord.notes = notes;
  paymentRecord.recordedBy = userId;

  if (paymentRecord.receivedAmount >= paymentRecord.amount) {
    paymentRecord.status = 'paid';
  } else if (paymentRecord.receivedAmount > 0) {
    paymentRecord.status = 'partially_paid';
  } else {
    paymentRecord.status = 'due';
  }

  paymentRecord.history.push({
    action: 'payment_recorded',
    performedBy: userId,
    timestamp: new Date(),
    details: { amount, method: 'cash', referenceNumber }
  });

  mockAuditLogs.push({
    _id: `audit-${Date.now()}`,
    performedBy: { name: 'Adarsh Kumar', email: 'owner@stayzen.demo' },
    action: 'record_payment',
    entityType: 'Payment',
    entityId: paymentRecord._id,
    details: {
      amount: Number(amount),
      purpose: purpose.toLowerCase(),
      invoiceMonth,
      method: 'cash',
      residentName: resident?.name || 'Resident',
      newValue: { status: paymentRecord.status, receivedAmount: paymentRecord.receivedAmount }
    },
    createdAt: new Date()
  });

  return paymentRecord;
};

export const updateMockPayment = (orgId, userId, id, data) => {
  const payment = mockPayments.find(p => p._id === id);
  if (!payment) throw new Error('Payment not found.');

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
    performedBy: userId,
    timestamp: new Date(),
    details: { oldValue, newValue: data }
  });

  mockAuditLogs.push({
    _id: `audit-${Date.now()}`,
    performedBy: { name: 'Adarsh Kumar', email: 'owner@stayzen.demo' },
    action: 'edit',
    entityType: 'Payment',
    entityId: payment._id,
    details: {
      purpose: payment.purpose,
      invoiceMonth: payment.invoiceMonth,
      residentName: payment.residentId?.name || 'Resident',
      oldValue,
      newValue: data
    },
    createdAt: new Date()
  });

  return payment;
};

export const deleteMockPayment = (orgId, userId, id) => {
  const idx = mockPayments.findIndex(p => p._id === id);
  if (idx === -1) throw new Error('Payment not found.');
  const payment = mockPayments[idx];

  mockAuditLogs.push({
    _id: `audit-${Date.now()}`,
    performedBy: { name: 'Adarsh Kumar', email: 'owner@stayzen.demo' },
    action: 'delete',
    entityType: 'Payment',
    entityId: payment._id,
    details: {
      amount: payment.amount,
      purpose: payment.purpose,
      invoiceMonth: payment.invoiceMonth,
      residentName: payment.residentId?.name || 'Resident',
      oldValue: {
        amount: payment.amount,
        receivedAmount: payment.receivedAmount,
        status: payment.status
      }
    },
    createdAt: new Date()
  });

  mockPayments.splice(idx, 1);
  return { success: true };
};

export const getMockAuditLogs = (orgId) => {
  return mockAuditLogs;
};

// Simulation runner to generate mock maintenance invoices
export function calculateMockNextDueDate(currentDueDate, frequency, customMonths = 1) {
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

export const checkAndGenerateMockPropertyMaintenanceCharges = (orgId) => {
  const today = new Date();
  
  mockProperties.forEach(property => {
    if (property.organizationId === orgId && property.maintenanceEnabled && property.maintenanceNextDueDate) {
      const nextDueDate = new Date(property.maintenanceNextDueDate);
      if (nextDueDate <= today) {
        const invoiceMonth = nextDueDate.toISOString().slice(0, 7);

        mockResidents.forEach(resident => {
          if (resident.propertyId === property._id && resident.status === 'active') {
            const existing = mockPayments.find(p => 
              p.residentId?._id === resident._id && 
              p.invoiceMonth === invoiceMonth && 
              p.purpose === 'maintenance' && 
              p.notes === `Maintenance charge for ${property.name}`
            );

            if (!existing) {
              mockPayments.push({
                _id: `pay-mock-m-${Date.now()}-${resident._id.slice(-4)}`,
                organizationId: orgId,
                propertyId: { _id: property._id, name: property.name },
                residentId: { _id: resident._id, name: resident.name, mobile: resident.mobile, email: resident.email },
                invoiceMonth,
                purpose: 'maintenance',
                amount: property.maintenanceAmount,
                receivedAmount: 0,
                status: 'due',
                notes: `Maintenance charge for ${property.name}`,
                transactions: [],
                history: []
              });

              // Add mock AuditLog
              mockAuditLogs.push({
                _id: `audit-${Date.now()}`,
                performedBy: { name: 'System Scheduler' },
                action: 'create',
                entityType: 'Payment',
                details: {
                  amount: property.maintenanceAmount,
                  purpose: 'maintenance',
                  invoiceMonth,
                  residentName: resident.name
                },
                createdAt: new Date()
              });
            }
          }
        });

        // Advance next due date
        property.maintenanceNextDueDate = calculateMockNextDueDate(
          nextDueDate,
          property.maintenanceFrequency,
          property.maintenanceCustomMonths
        );
      }
    }
  });
};


