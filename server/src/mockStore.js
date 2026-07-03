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

export let mockPayments = [
  { name: 'Arjun Mehta', room: '101 · Bed A', amount: 12000, status: 'Overdue', date: 'Due 5 Jun', initials: 'AM', color: '#efb36f' },
  { name: 'Nikhil Sharma', room: '102 · Bed A', amount: 9000, status: 'Due soon', date: 'Due 28 Jun', initials: 'NS', color: '#7ab4aa' },
  { name: 'Rahul Verma', room: '103 · Bed A', amount: 7500, status: 'Paid', date: 'Paid 3 Jun', initials: 'RV', color: '#8ca4d8' },
  { name: 'Kabir Khan', room: '103 · Bed B', amount: 7500, status: 'Paid', date: 'Paid 2 Jun', initials: 'KK', color: '#c196d2' }
];

export const getDashboardStats = () => {
  const totalBeds = mockProperties.reduce((acc, p) => acc + p.rooms.reduce((rAcc, r) => rAcc + r.beds.length, 0), 0);
  const occupiedBeds = mockProperties.reduce((acc, p) => acc + p.rooms.reduce((rAcc, r) => rAcc + r.beds.filter(b => b.status === 'occupied').length, 0), 0);
  const vacantBeds = totalBeds - occupiedBeds;
  const residentsCount = mockResidents.length;

  let collected = 0;
  let pending = 0;
  mockPayments.forEach(p => {
    if (p.status === 'Paid') {
      collected += p.amount;
    } else {
      pending += p.amount;
    }
  });

  return {
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
      { id: 1, type: 'danger', icon: '₹', title: `${mockPayments.filter(p=>p.status==='Overdue').length} rent payments overdue`, meta: `₹${new Intl.NumberFormat('en-IN').format(pending)} outstanding`, action: 'Review dues' },
      { id: 2, type: 'warn', icon: '⌛', title: '4 agreements expiring', meta: 'Within the next 30 days', action: 'View residents' },
      { id: 3, type: 'info', icon: '▦', title: `${vacantBeds} beds are available`, meta: `Across ${mockProperties.reduce((acc, p) => acc + p.rooms.filter(r => r.beds.some(b => b.status === 'vacant')).length, 0)} rooms`, action: 'View inventory' }
    ],
    payments: mockPayments
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
  const newMember = {
    id: `demo-member-${Date.now()}`,
    status: 'invited',
    ...body
  };
  mockMembers.push(newMember);
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
