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
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/admin', adminRoutes);

app.post('/api/webhooks/cashfree', async (req, res) => {
  try {
    const paymentService = await import('./services/paymentService.js');
    await paymentService.default.handleWebhook('cashfree', req.headers, req.rawBody || '');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Error handling cashfree webhook:', err);
    res.status(400).json({ error: err.message });
  }
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

// Serve static client build assets in production
const clientBuildPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Wildcard routing to serve React SPA index.html for non-API client routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'));
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

// Picked up new Cashfree env variables, provider updates, and dynamic getters for reload.

