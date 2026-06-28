import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { Organization } from '../models/Organization.js';

const router = Router();
router.use(authenticate, (req, res, next) => req.auth.platformRole === 'super_admin' ? next() : res.status(403).json({ message: 'Super admin access required.' }));
router.get('/organizations', async (_req, res) => res.json(await Organization.find().sort({ createdAt: -1 }).lean()));
router.patch('/organizations/:id/status', async (req, res) => {
  const allowed = ['pending', 'active', 'rejected', 'suspended'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid organization status.' });
  res.json(await Organization.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }));
});
export default router;
