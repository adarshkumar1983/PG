import { Router } from 'express';
import { authenticate, authorize, resolveTenant } from '../auth/middleware.js';
import { permissions } from '../auth/permissions.js';
import * as tenantController from '../controllers/tenantController.js';

const router = Router();

// Apply authentication and tenant resolution middlewares to all routes in this router
router.use(authenticate, resolveTenant);

// Custom authorization check for dashboard
const authorizeDashboard = (req, res, next) => {
  const allowed = req.tenant?.permissions || [];
  if (allowed.includes('*') || allowed.includes(permissions.REPORT_READ) || allowed.includes(permissions.PAYMENT_OWN_READ)) {
    return next();
  }
  return res.status(403).json({ message: 'Insufficient permission.' });
};

router.get('/dashboard', authorizeDashboard, tenantController.getDashboard);

router.route('/residents')
  .get(authorize(permissions.RESIDENT_READ), tenantController.getResidents)
  .post(authorize(permissions.RESIDENT_WRITE), tenantController.createResident);

router.route('/properties')
  .get(authorize(permissions.RESIDENT_READ), tenantController.getProperties)
  .post(authorize(permissions.MANAGE_PG), tenantController.createProperty);

router.put('/properties/:id', authorize(permissions.MANAGE_PG), tenantController.updateProperty);

router.route('/members')
  .get(authorize(permissions.STAFF_MANAGE), tenantController.getMembers)
  .post(authorize(permissions.STAFF_MANAGE), tenantController.createMember);

router.route('/members/:id')
  .put(authorize(permissions.STAFF_MANAGE), tenantController.updateMember);

router.post('/members/:id/resend-invite', authorize(permissions.STAFF_MANAGE), tenantController.resendInvite);

router.route('/payments')
  .get(authorize(permissions.PAYMENT_READ), tenantController.getPayments);

router.route('/payments/:id')
  .put(authorize(permissions.PAYMENT_WRITE), tenantController.updatePayment)
  .delete(authorize(permissions.PAYMENT_WRITE), tenantController.deletePayment);

router.post('/payments/record-cash', authorize(permissions.PAYMENT_WRITE), tenantController.recordCashPayment);
router.post('/invoices', authorize(permissions.PAYMENT_WRITE), tenantController.createInvoice);

router.route('/expenses')
  .get(authorize(permissions.EXPENSE_READ), tenantController.getExpenses)
  .post(authorize(permissions.EXPENSE_WRITE), tenantController.createExpense);

router.get('/audit-logs', authorize(permissions.REPORT_READ), tenantController.getAuditLogs);

router.post('/maintenance-configs/trigger', authorize(permissions.PAYMENT_WRITE), tenantController.triggerScheduledMaintenanceInvoices);

export default router;
