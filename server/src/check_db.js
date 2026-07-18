import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from './models/User.js';
import { Membership } from './models/Membership.js';
import { Resident } from './models/Resident.js';
import { Payment } from './models/Finance.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;
console.log('Checking database at:', uri);

if (!uri) {
  console.error('MONGODB_URI is undefined!');
  process.exit(1);
}

try {
  await mongoose.connect(uri);
  console.log('Connected!');
  
  const users = await User.find().lean();
  console.log('--- USERS ---');
  console.log(users.map(u => ({ id: u._id, name: u.name, email: u.email })));
  
  const memberships = await Membership.find().lean();
  console.log('--- MEMBERSHIPS ---');
  console.log(memberships.map(m => ({ org: m.organizationId, user: m.userId, role: m.role, status: m.status })));
  
  const residents = await Resident.find().lean();
  console.log('--- RESIDENTS ---');
  console.log(residents.map(r => ({ id: r._id, name: r.name, email: r.email, userId: r.userId })));

  const payments = await Payment.find().lean();
  console.log('--- PAYMENTS ---');
  console.log(payments.map(p => ({ id: p._id, purpose: p.purpose, status: p.status, amount: p.amount, gatewayOrderId: p.gatewayOrderId })));

  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
