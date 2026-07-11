import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  label: { type: String, required: true },
  monthlyRent: { type: Number, min: 0, required: true },
  status: { type: String, enum: ['vacant', 'occupied', 'maintenance'], default: 'vacant' },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' }
});
const roomSchema = new mongoose.Schema({
  number: { type: String, required: true },
  floor: String,
  category: String,
  acType: { type: String, enum: ['ac', 'non-ac'], default: 'non-ac' },
  sharingType: { type: String, enum: ['single', 'double', 'triple', 'four-sharing', 'other'], default: 'double' },
  beds: { type: [bedSchema], default: [] }
});
const propertySchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true }, address: String, contactNumber: String,
  gstNumber: String, amenities: [String], photos: [String], rooms: { type: [roomSchema], default: [] },
  
  // Maintenance Settings
  maintenanceEnabled: { type: Boolean, default: false },
  maintenanceAmount: { type: Number, default: 0 },
  maintenanceFrequency: { type: String, enum: ['monthly', '2_months', '3_months', '4_months', '6_months', 'yearly', 'custom'], default: 'monthly' },
  maintenanceCustomMonths: { type: Number, default: 1 },
  maintenanceNextDueDate: { type: Date },
  maintenanceSeparateInvoice: { type: Boolean, default: false }
}, { timestamps: true });

propertySchema.index({ organizationId: 1, name: 1 });
export const Property = mongoose.model('Property', propertySchema);
