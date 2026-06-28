import jwt from 'jsonwebtoken';
import { Membership } from '../models/Membership.js';
import { rolePermissions } from './permissions.js';

const secret = () => process.env.JWT_ACCESS_SECRET || 'development-only-change-me';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7);
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try { req.auth = jwt.verify(token, secret()); next(); }
  catch { return res.status(401).json({ message: 'Invalid or expired access token.' }); }
}

export async function resolveTenant(req, res, next) {
  const organizationId = req.headers['x-organization-id'];
  if (!organizationId) return res.status(400).json({ message: 'x-organization-id is required.' });
  if (req.auth.sub === 'demo-owner' && organizationId === 'demo-org') {
    req.tenant = { organizationId, role: 'owner', permissions: rolePermissions.owner }; return next();
  }
  if (req.auth.platformRole === 'super_admin') {
    req.tenant = { organizationId, role: 'super_admin', permissions: ['*'] }; return next();
  }
  const membership = await Membership.findOne({ organizationId, userId: req.auth.sub, status: 'active' }).lean();
  if (!membership) return res.status(403).json({ message: 'You do not belong to this organization.' });
  req.tenant = { organizationId, role: membership.role, permissions: [...rolePermissions[membership.role], ...membership.permissions] };
  next();
}

export const authorize = permission => (req, res, next) => {
  const allowed = req.tenant?.permissions || rolePermissions[req.auth?.platformRole] || [];
  if (!allowed.includes('*') && !allowed.includes(permission)) return res.status(403).json({ message: 'Insufficient permission.' });
  next();
};

export const tenantFilter = req => ({ organizationId: req.tenant.organizationId });
