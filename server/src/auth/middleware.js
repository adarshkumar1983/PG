import jwt from 'jsonwebtoken';
import { Membership } from '../models/Membership.js';
import { rolePermissions } from './permissions.js';

const secret = () => {
  const s = process.env.JWT_ACCESS_SECRET;
  if (process.env.NODE_ENV === 'production' && (!s || s.includes('change-me'))) {
    throw new Error('FATAL: JWT_ACCESS_SECRET must be configured securely in production.');
  }
  return s || 'dev-access-secret-entropy-9988223311';
};

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.auth = jwt.verify(token, secret(), { algorithms: ['HS256'] });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired access token.' });
  }
}

export async function resolveTenant(req, res, next) {
  const rawOrgId = req.headers['x-organization-id'] || req.query.organizationId;
  if (!rawOrgId || typeof rawOrgId !== 'string') {
    return res.status(400).json({ message: 'x-organization-id is required and must be a valid string.' });
  }
  const organizationId = String(rawOrgId).trim();

  if (process.env.NODE_ENV !== 'production' && req.auth.sub === 'demo-owner' && organizationId === 'demo-org') {
    req.tenant = { organizationId, role: 'owner', permissions: rolePermissions.owner }; 
    return next();
  }

  if (req.auth.platformRole === 'super_admin') {
    req.tenant = { organizationId, role: 'super_admin', permissions: ['*'] }; 
    return next();
  }

  const membership = await Membership.findOne({ organizationId, userId: req.auth.sub, status: 'active' }).lean();
  if (!membership) return res.status(403).json({ message: 'You do not belong to this organization.' });
  
  const basePermissions = rolePermissions[membership.role] || [];
  const customPermissions = Array.isArray(membership.permissions) ? membership.permissions : [];
  req.tenant = { organizationId, role: membership.role, permissions: [...basePermissions, ...customPermissions] };
  next();
}

export const authorize = permission => (req, res, next) => {
  const allowed = req.tenant?.permissions || rolePermissions[req.auth?.platformRole] || [];
  if (!allowed.includes('*') && !allowed.includes(permission)) return res.status(403).json({ message: 'Insufficient permission.' });
  next();
};

export const tenantFilter = req => ({ organizationId: req.tenant.organizationId });
