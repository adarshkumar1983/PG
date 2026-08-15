import { asyncHandler } from '../utils/asyncHandler.js';
import * as tenantService from '../services/tenantService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sentEmailsDir = path.resolve(__dirname, '../../sent_emails');

/**
 * GET dashboard statistics
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const stats = await tenantService.getDashboard(req.tenant, req.auth);
  res.json(stats);
});

/**
 * GET all residents in the organization
 */
export const getResidents = asyncHandler(async (req, res) => {
  const residents = await tenantService.getResidents(req.tenant);
  res.json(residents);
});

/**
 * POST / Register a new resident
 */
export const createResident = asyncHandler(async (req, res) => {
  const newResident = await tenantService.createResident(req.tenant, req.body);
  res.status(201).json(newResident);
});

/**
 * GET all properties under organization
 */
export const getProperties = asyncHandler(async (req, res) => {
  const properties = await tenantService.getProperties(req.tenant);
  res.json(properties);
});

/**
 * POST / Add a new property
 */
export const createProperty = asyncHandler(async (req, res) => {
  const newProperty = await tenantService.createProperty(req.tenant, req.body);
  res.status(201).json(newProperty);
});

/**
 * PUT / Update property details
 */
export const updateProperty = asyncHandler(async (req, res) => {
  const updatedProperty = await tenantService.updateProperty(req.tenant, req.params.id, req.body);
  res.json(updatedProperty);
});

/**
 * GET all staff / members of the organization
 */
export const getMembers = asyncHandler(async (req, res) => {
  const members = await tenantService.getMembers(req.tenant);
  res.json(members);
});

/**
 * POST / Invite a new member
 */
export const createMember = asyncHandler(async (req, res) => {
  const newMember = await tenantService.createMember(req.tenant, req.body);
  res.status(201).json(newMember);
});

/**
 * PUT / Update member details/role
 */
export const updateMember = asyncHandler(async (req, res) => {
  const updatedMember = await tenantService.updateMember(req.tenant, req.params.id, req.body);
  res.json(updatedMember);
});

/**
 * POST / Resend invitation to a member
 */
export const resendInvite = asyncHandler(async (req, res) => {
  const result = await tenantService.resendInvite(req.tenant, req.params.id);
  res.json(result);
});

/**
 * GET all payment transactions
 */
export const getPayments = asyncHandler(async (req, res) => {
  const payments = await tenantService.getPayments(req.tenant, req.auth);
  res.json(payments);
});

/**
 * POST / Record a new expense
 */
export const createExpense = asyncHandler(async (req, res) => {
  const newExpense = await tenantService.createExpense(req.tenant, req.auth, req.body);
  res.status(201).json(newExpense);
});

/**
 * GET / Get all expenses
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await tenantService.getExpenses(req.tenant);
  res.json(expenses);
});

/**
 * POST / Create a due payment (invoice)
 */
export const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await tenantService.createInvoice(req.tenant, req.body);
  res.status(201).json(invoice);
});

/**
 * POST / Record cash payment
 */
export const recordCashPayment = asyncHandler(async (req, res) => {
  const payment = await tenantService.recordCashPayment(req.tenant, req.auth, req.body);
  res.status(201).json(payment);
});

/**
 * PUT / Update payment
 */
export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await tenantService.updatePayment(req.tenant, req.auth, req.params.id, req.body);
  res.json(payment);
});

/**
 * DELETE / Delete payment
 */
export const deletePayment = asyncHandler(async (req, res) => {
  const result = await tenantService.deletePayment(req.tenant, req.auth, req.params.id);
  res.json(result);
});

/**
 * GET / Get all audit logs
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await tenantService.getAuditLogs(req.tenant);
  res.json(logs);
});

/**
 * Maintenance Scheduler Trigger
 */
export const triggerScheduledMaintenanceInvoices = asyncHandler(async (req, res) => {
  await tenantService.checkAndGeneratePropertyMaintenanceCharges(req.tenant);
  res.json({ success: true, message: 'Maintenance invoice generation triggered successfully.' });
});

/**
 * POST / Initiate Razorpay Charge (Create Order)
 */
export const initiateCharge = asyncHandler(async (req, res) => {
  const chargeInfo = await tenantService.initiateCharge(req.tenant, req.auth, req.params.id);
  res.json(chargeInfo);
});

/**
 * POST / Verify Razorpay Cryptographic Signature
 */
export const verifyOnlinePayment = asyncHandler(async (req, res) => {
  const result = await tenantService.verifyOnlinePayment(req.tenant, req.auth, req.body);
  res.json(result);
});

/**
 * GET / Get Organization settings
 */
export const getOrganizationSettings = asyncHandler(async (req, res) => {
  const settings = await tenantService.getOrganizationSettings(req.tenant);
  res.json(settings);
});

/**
 * PUT / Update Organization settings
 */
export const updateOrganizationSettings = asyncHandler(async (req, res) => {
  const updated = await tenantService.updateOrganizationSettings(req.tenant, { ...req.body, userId: req.auth.sub });
  res.json(updated);
});

/**
 * POST / Verify Bank Account details
 */
export const verifyBankAccount = asyncHandler(async (req, res) => {
  const result = await tenantService.verifyBankAccount(req.tenant, req.body);
  res.json(result);
});

/**
 * GET / Get Settlement Analytics & History
 */
export const getSettlementAnalytics = asyncHandler(async (req, res) => {
  const analytics = await tenantService.getSettlementAnalytics(req.tenant);
  res.json(analytics);
});

/**
 * GET / Get Notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await tenantService.getNotifications(req.tenant, req.auth);
  res.json(notifications);
});

/**
 * PUT / Mark Notification as Read
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const result = await tenantService.markNotificationRead(req.tenant, req.params.id);
  res.json(result);
});

/**
 * POST / Report offline payment (UPI QR / Bank Transfer)
 */
export const reportOfflinePayment = asyncHandler(async (req, res) => {
  const result = await tenantService.reportOfflinePayment(req.tenant, req.auth, req.params.id, req.body);
  res.json(result);
});

/**
 * POST / Approve reported offline payment
 */
export const approveOfflinePayment = asyncHandler(async (req, res) => {
  const result = await tenantService.approveOfflinePayment(req.tenant, req.auth, req.params.id);
  res.json(result);
});

/**
 * GET / Get Mess Menu
 */
export const getMessMenu = asyncHandler(async (req, res) => {
  const propertyId = req.query.propertyId || req.headers['x-property-id'];
  const menu = await tenantService.getMessMenu(req.tenant.organizationId, propertyId);
  res.json(menu);
});

/**
 * POST / Update Mess Menu
 */
export const updateMessMenu = asyncHandler(async (req, res) => {
  const propertyId = req.body.propertyId || req.headers['x-property-id'];
  const { dayOfWeek, breakfast, lunch, snacks, dinner } = req.body;
  if (!dayOfWeek) return res.status(400).json({ message: 'dayOfWeek is required.' });
  const updated = await tenantService.updateMessMenu(req.tenant.organizationId, propertyId, dayOfWeek, { breakfast, lunch, snacks, dinner });
  res.json(updated);
});

/**
 * GET / Get Meal Skips
 */
export const getMealSkips = asyncHandler(async (req, res) => {
  const propertyId = req.query.propertyId || req.headers['x-property-id'];
  const date = req.query.date;
  const skips = await tenantService.getMealSkips(req.tenant.organizationId, propertyId, date);
  res.json(skips);
});

/**
 * POST / Toggle Meal Skip
 */
export const toggleMealSkip = asyncHandler(async (req, res) => {
  const propertyId = req.body.propertyId || req.headers['x-property-id'];
  const result = await tenantService.toggleMealSkip(req.tenant.organizationId, propertyId, req.body);
  res.json(result);
});

/**
 * GET / List simulated emails (Development only)
 */
export const getSentEmails = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Endpoint not found.' });
  }

  if (!fs.existsSync(sentEmailsDir)) {
    return res.json([]);
  }
  const files = fs.readdirSync(sentEmailsDir);
  const emails = [];
  for (const file of files) {
    if (file.endsWith('.html')) {
      const filePath = path.join(sentEmailsDir, file);
      const stat = fs.statSync(filePath);
      // Format: prefix-sanitizedEmail-timestamp.html
      const parts = file.replace('.html', '').split('-');
      const timestamp = parseInt(parts.pop() || '0');
      const recipient = parts.pop() || 'unknown';
      const type = parts.join('-');
      emails.push({
        filename: file,
        type,
        recipient: recipient.replace(/_/g, '@'),
        sentAt: new Date(timestamp).toISOString(),
        timestamp
      });
    }
  }
  emails.sort((a, b) => b.timestamp - a.timestamp);
  res.json(emails);
});

/**
 * GET / View single simulated email HTML content (Development only)
 */
export const getSentEmailContent = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Endpoint not found.' });
  }

  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(sentEmailsDir, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Email file not found.' });
  }
  let html = fs.readFileSync(filePath, 'utf8');
  // Mask sensitive reset token strings if present
  html = html.replace(/token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g, 'token=[MASKED_FOR_SECURITY]');
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline'");
  res.send(html);
});


