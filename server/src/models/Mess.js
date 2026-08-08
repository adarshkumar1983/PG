import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema({
  items: { type: String, default: '' },
  timing: { type: String, default: '' }
}, { _id: false });

const messMenuSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  breakfast: { type: mealSchema, default: () => ({ items: 'Puri Bhaji / Tea', timing: '08:00 AM - 10:00 AM' }) },
  lunch: { type: mealSchema, default: () => ({ items: 'Roti, Dal Tadka, Rice, Sabzi, Curd', timing: '01:00 PM - 03:00 PM' }) },
  snacks: { type: mealSchema, default: () => ({ items: 'Samosa / Biscuits & Tea', timing: '05:30 PM - 06:30 PM' }) },
  dinner: { type: mealSchema, default: () => ({ items: 'Roti, Paneer Curry, Dal, Rice, Kheer', timing: '08:00 PM - 10:00 PM' }) }
}, { timestamps: true });

messMenuSchema.index({ propertyId: 1, dayOfWeek: 1 });

const mealSkipSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  residentId: { type: String, required: true, index: true },
  residentName: { type: String, required: true },
  roomNumber: { type: String, default: 'N/A' },
  date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
  meals: [{ type: String, enum: ['breakfast', 'lunch', 'snacks', 'dinner'] }],
  reason: { type: String, default: 'Out of PG' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }
}, { timestamps: true });

mealSkipSchema.index({ propertyId: 1, residentId: 1, date: 1 }, { unique: true });

export const MessMenu = mongoose.model('MessMenu', messMenuSchema);
export const MealSkip = mongoose.model('MealSkip', mealSkipSchema);
