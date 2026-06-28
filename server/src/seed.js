export const dashboard = {
  property: 'Greenview Residency', owner: 'Adarsh', month: 'June 2026',
  stats: { residents: 84, rooms: 38, occupiedBeds: 84, totalBeds: 102, collected: 462500, pending: 87500 },
  attention: [
    { id: 1, type: 'danger', icon: '₹', title: '11 rent payments overdue', meta: '₹68,500 outstanding', action: 'Review dues' },
    { id: 2, type: 'warn', icon: '⌛', title: '4 agreements expiring', meta: 'Within the next 30 days', action: 'View residents' },
    { id: 3, type: 'info', icon: '▦', title: '18 beds are available', meta: 'Across 9 rooms', action: 'View inventory' }
  ],
  payments: [
    { name: 'Arjun Mehta', room: 'A-204 · Bed 2', amount: 8500, status: 'Overdue', date: 'Due 5 Jun', initials: 'AM', color: '#efb36f' },
    { name: 'Nikhil Sharma', room: 'B-102 · Bed 1', amount: 7500, status: 'Due soon', date: 'Due 28 Jun', initials: 'NS', color: '#7ab4aa' },
    { name: 'Rahul Verma', room: 'A-103 · Bed 3', amount: 8000, status: 'Paid', date: 'Paid 3 Jun', initials: 'RV', color: '#8ca4d8' },
    { name: 'Kabir Khan', room: 'C-301 · Bed 1', amount: 9000, status: 'Paid', date: 'Paid 2 Jun', initials: 'KK', color: '#c196d2' }
  ]
};
