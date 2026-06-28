import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { dashboard } from './seed.js';
import authRoutes from './auth/routes.js';
import tenantRoutes from './routes/tenant.js';
import adminRoutes from './routes/admin.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/admin', adminRoutes);

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(error => console.error('MongoDB connection failed:', error.message));
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'demo-mode' }));
app.get('/api/dashboard', (_req, res) => res.json(dashboard));
app.post('/api/residents', (req, res) => {
  const { name, phone, checkInDate } = req.body;
  if (!name || !phone || !checkInDate) return res.status(400).json({ message: 'Name, phone and check-in date are required.' });
  res.status(201).json({ id: crypto.randomUUID(), ...req.body, status: 'draft' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`StayZen API running on http://localhost:${port}`));
