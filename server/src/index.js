// Register exception handlers first to catch any ECANCELED/abort errors during module load
process.on('uncaughtException', (err) => {
  if (err && err.code === 'ECANCELED') {
    // Ignore ECANCELED errors during watch mode process termination
    process.exit(0);
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Dynamic imports of modules to ensure exception handlers are registered first
const express = (await import('express')).default;
const cors = (await import('cors')).default;
const dotenv = (await import('dotenv')).default;
const mongoose = (await import('mongoose')).default;
const { dashboard } = await import('./seed.js');
const authRoutes = (await import('./auth/routes.js')).default;
const tenantRoutes = (await import('./routes/tenant.js')).default;
const adminRoutes = (await import('./routes/admin.js')).default;

const path = (await import('path')).default;
const { fileURLToPath } = await import('url');
const crypto = await import('crypto');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from different possible locations
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/admin', adminRoutes);

app.post('/api/payments/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (secret && signature) {
    const crypto = await import('crypto');
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.warn('Webhook signature verification failed.');
      return res.status(400).json({ status: 'signature_invalid' });
    }
  }

  const { event, payload } = req.body;
  try {
    const tenantService = await import('./services/tenantService.js');
    await tenantService.handleRazorpayWebhook(event, payload);
  } catch (err) {
    console.error('Error handling webhook event:', err);
  }

  res.json({ status: 'ok' });
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected');
      // Drop old unique payment index if it exists
      mongoose.connection.db.collection('payments').dropIndex('organizationId_1_residentId_1_invoiceMonth_1')
        .then(() => console.log('Old payment unique index dropped successfully.'))
        .catch(() => {
          // Index might not exist, which is fine
        });
    })
    .catch(error => console.error('MongoDB connection failed:', error.message));
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'demo-mode' }));
app.get('/api/dashboard', (_req, res) => res.json(dashboard));
app.post('/api/residents', (req, res) => {
  const { name, phone, checkInDate } = req.body;
  if (!name || !phone || !checkInDate) return res.status(400).json({ message: 'Name, phone and check-in date are required.' });
  res.status(201).json({ id: crypto.randomUUID(), ...req.body, status: 'draft' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred.';
  res.status(status).json({ message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`StayZen API running on http://localhost:${port}`));

