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
const compression = (await import('compression')).default;
const helmet = (await import('helmet')).default;
const rateLimit = (await import('express-rate-limit')).default;
const dotenv = (await import('dotenv')).default;
const mongoose = (await import('mongoose')).default;
const authRoutes = (await import('./auth/routes.js')).default;
const tenantRoutes = (await import('./routes/tenant.js')).default;
const adminRoutes = (await import('./routes/admin.js')).default;

const path = (await import('path')).default;
const { fileURLToPath } = await import('url');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from different possible locations
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Startup validation for production security keys
if (process.env.NODE_ENV === 'production') {
  const jwtSecret = process.env.JWT_ACCESS_SECRET;
  if (!jwtSecret || jwtSecret.includes('change-me') || jwtSecret.length < 32) {
    console.error('FATAL: Production JWT_ACCESS_SECRET is missing or has insufficient entropy (min 32 chars).');
    process.exit(1);
  }
}

const app = express();

// Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "https://api.cashfree.com", "https://sandbox.cashfree.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());

// Strict CORS Configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('CORS policy does not allow access from the specified origin.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'x-property-id', 'x-webhook-signature', 'x-webhook-timestamp']
}));

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 15, // max 15 attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again in a few moments.' }
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120, // max 120 webhook calls per minute
  standardHeaders: true,
  legacyHeaders: false
});

// JSON Body Parser with size limit and raw body capture for webhook signature verification
app.use(express.json({
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/admin', adminRoutes);

app.post('/api/webhooks/cashfree', webhookLimiter, async (req, res) => {
  try {
    const paymentService = await import('./services/paymentService.js');
    const result = await paymentService.default.handleWebhook('cashfree', req.headers, req.rawBody || '');
    res.json(result || { status: 'ok' });
  } catch (err) {
    console.error('Error handling cashfree webhook:', err.message);
    res.status(400).json({ error: err.message || 'Webhook verification failed' });
  }
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected');
    })
    .catch(error => console.error('MongoDB connection failed:', error.message));
}

app.get('/api/health', (_req, res) => res.json({ 
  status: 'ok', 
  database: mongoose.connection.readyState === 1 ? 'connected' : 'demo-mode' 
}));

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
  console.error('API Error:', err.message || err);
  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred.';
  res.status(status).json({ message });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`StayZen API running on http://localhost:${port}`));

