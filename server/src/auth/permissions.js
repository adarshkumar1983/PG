export const permissions = {
  CREATE_PG: 'pg:create', MANAGE_PG: 'pg:manage', DELETE_PG: 'pg:delete',
  RESIDENT_READ: 'resident:read', RESIDENT_WRITE: 'resident:write',
  PAYMENT_READ: 'payment:read', PAYMENT_OWN_READ: 'payment:own:read', PAYMENT_WRITE: 'payment:write',
  EXPENSE_READ: 'expense:read', EXPENSE_WRITE: 'expense:write',
  STAFF_MANAGE: 'staff:manage', REPORT_READ: 'report:read', SUPPORT_WRITE: 'support:write'
};

export const rolePermissions = {
  super_admin: ['*'],
  owner: [permissions.CREATE_PG, permissions.MANAGE_PG, permissions.RESIDENT_READ, permissions.RESIDENT_WRITE,
    permissions.PAYMENT_READ, permissions.PAYMENT_WRITE, permissions.EXPENSE_READ, permissions.EXPENSE_WRITE,
    permissions.STAFF_MANAGE, permissions.REPORT_READ, permissions.SUPPORT_WRITE],
  staff: [permissions.RESIDENT_READ, permissions.RESIDENT_WRITE, permissions.PAYMENT_READ,
    permissions.PAYMENT_WRITE, permissions.EXPENSE_READ, permissions.EXPENSE_WRITE, permissions.REPORT_READ],
  resident: [permissions.PAYMENT_OWN_READ, permissions.SUPPORT_WRITE]
};
