export const fallback = {
  property: 'Greenview Residency',
  owner: 'Adarsh',
  month: 'June 2026',
  stats: {
    residents: 84,
    rooms: 38,
    occupiedBeds: 84,
    totalBeds: 102,
    collected: 462500,
    pending: 87500
  },
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
  ],
  messMenu: [
    { dayOfWeek: 'Monday', breakfast: { items: 'Aloo Paratha, Curd & Tea', timing: '08:00 AM - 10:00 AM' }, lunch: { items: 'Roti, Dal Tadka, Jeera Rice, Bhindi Fry, Butter Milk', timing: '01:00 PM - 03:00 PM' }, snacks: { items: 'Samosa & Masala Chai', timing: '05:30 PM - 06:30 PM' }, dinner: { items: 'Roti, Paneer Butter Masala, Rice, Dal, Gulab Jamun', timing: '08:00 PM - 10:00 PM' } },
    { dayOfWeek: 'Tuesday', breakfast: { items: 'Idli, Vada, Sambar & Coconut Chutney', timing: '08:00 AM - 10:00 AM' }, lunch: { items: 'Roti, Rajma Masala, Steamed Rice, Mix Veg, Curd', timing: '01:00 PM - 03:00 PM' }, snacks: { items: 'Veg Sandwich & Coffee', timing: '05:30 PM - 06:30 PM' }, dinner: { items: 'Roti, Chana Masala, Veg Pulao, Dal, Fruit Custard', timing: '08:00 PM - 10:00 PM' } },
    { dayOfWeek: 'Wednesday', breakfast: { items: 'Poha, Sev, Jalebi & Tea', timing: '08:00 AM - 10:00 AM' }, lunch: { items: 'Roti, Kadhi Pakora, Steamed Rice, Aloo Gobi, Salad', timing: '01:00 PM - 03:00 PM' }, snacks: { items: 'Kachori & Tea', timing: '05:30 PM - 06:30 PM' }, dinner: { items: 'Roti, Egg Curry / Malai Kofta, Dal Fry, Rice, Ice Cream', timing: '08:00 PM - 10:00 PM' } },
    { dayOfWeek: 'Thursday', breakfast: { items: 'Masala Dosa, Sambhar & Green Chutney', timing: '08:00 AM - 10:00 AM' }, lunch: { items: 'Roti, Chana Dal, Steamed Rice, Baingan Bharta, Raita', timing: '01:00 PM - 03:00 PM' }, snacks: { items: 'Bread Pakora & Coffee', timing: '05:30 PM - 06:30 PM' }, dinner: { items: 'Roti, Mushroom Masala, Dal Makhani, Rice, Sweet Boondi', timing: '08:00 PM - 10:00 PM' } },
    { dayOfWeek: 'Friday', breakfast: { items: 'Chole Bhature & Lassi', timing: '08:00 AM - 10:00 AM' }, lunch: { items: 'Roti, Veg Kolhapuri, Dal Tadka, Rice, Curd', timing: '01:00 PM - 03:00 PM' }, snacks: { items: 'Pav Bhaji & Tea', timing: '05:30 PM - 06:30 PM' }, dinner: { items: 'Veg / Chicken Biryani, Mirchi Ka Salan, Raita, Rasgulla', timing: '08:00 PM - 10:00 PM' } },
    { dayOfWeek: 'Saturday', breakfast: { items: 'Uttapam, Tomato Chutney & Filter Coffee', timing: '08:00 AM - 10:00 AM' }, lunch: { items: 'Roti, Aloo Matar, Dal Fry, Steamed Rice, Salad', timing: '01:00 PM - 03:00 PM' }, snacks: { items: 'French Fries & Tea', timing: '05:30 PM - 06:30 PM' }, dinner: { items: 'Roti, Shahi Paneer, Dal Tadka, Jeera Rice, Halwa', timing: '08:00 PM - 10:00 PM' } },
    { dayOfWeek: 'Sunday', breakfast: { items: 'Puri Bhaji, Tea & Banana', timing: '08:00 AM - 10:00 AM' }, lunch: { items: 'Special Thali - Paneer Tikka, Veg Pulao, Naan, Dal Makhani, Ice Cream', timing: '01:00 PM - 03:30 PM' }, snacks: { items: 'Biscuits & Masala Tea', timing: '05:30 PM - 06:30 PM' }, dinner: { items: 'Roti, Mix Veg Curry, Dal, Steamed Rice, Kheer', timing: '08:00 PM - 10:00 PM' } }
  ],
  mealSkips: [
    { _id: 'skip-1', residentName: 'Aarav Sharma', roomNumber: '101', date: new Date().toISOString().split('T')[0], meals: ['dinner'], reason: 'Dinner out with colleagues', status: 'approved' },
    { _id: 'skip-2', residentName: 'Priya Patel', roomNumber: '102', date: new Date().toISOString().split('T')[0], meals: ['breakfast', 'lunch'], reason: 'Traveling for weekend', status: 'approved' }
  ]
};
