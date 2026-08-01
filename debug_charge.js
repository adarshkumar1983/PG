import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import { Organization } from './server/src/models/Organization.js';
import { Payment } from './server/src/models/Finance.js';
import { initiateCharge } from './server/src/services/tenantService.js';

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set in env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const orgId = '6a44acb57c864366447621af';
  const org = await Organization.findById(orgId);
  if (!org) {
    console.error(`Org ${orgId} not found`);
    process.exit(1);
  }
  console.log(`Using Org: ${org.name}, LinkedAccount: "${org.gateway?.linkedAccountId}"`);

  // Find a payment with outstanding amount > 0
  const payment = await Payment.findOne({ organizationId: orgId, status: { $ne: 'paid' } });
  if (!payment) {
    console.log('No unpaid payments found. Looking for any payment...');
    const anyPayment = await Payment.findOne({ organizationId: orgId });
    if (!anyPayment) {
      console.error('No payments found in database for this organization.');
      process.exit(1);
    }
    console.log(`Found payment: ${anyPayment._id}, status: ${anyPayment.status}, amount: ${anyPayment.amount}`);
    
    // Temporarily reset status so we can test initiateCharge
    anyPayment.status = 'due';
    anyPayment.receivedAmount = 0;
    await anyPayment.save();
    console.log('Temporarily reset payment status to due.');
  }

  const activePayment = payment || await Payment.findOne({ organizationId: orgId });
  console.log(`Testing with Payment ID: ${activePayment._id}, amount: ${activePayment.amount}`);

  const tenant = { organizationId: orgId };
  const auth = { sub: org.ownerUserId };

  try {
    const result = await initiateCharge(tenant, auth, activePayment._id.toString());
    console.log('Success! Result:', result);
  } catch (err) {
    console.error('FAILED with error:');
    console.error(err);
    if (err.error) {
      console.error('Razorpay Error Details:', JSON.stringify(err.error, null, 2));
    }
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
