import { asyncHandler } from '../utils/asyncHandler.js';
import * as tenantService from '../services/tenantService.js';

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
  const notifications = await tenantService.getNotifications(req.tenant);
  res.json(notifications);
});

/**
 * PUT / Mark Notification as Read
 */
export const markNotificationRead = asyncHandler(async (req, res) => {
  const result = await tenantService.markNotificationRead(req.tenant, req.params.id);
  res.json(result);
});
