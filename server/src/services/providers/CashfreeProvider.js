import crypto from 'crypto';
import https from 'https';
import { Payment } from '../../models/Finance.js';
import { Resident } from '../../models/Resident.js';
import { Notification } from '../../models/Notification.js';

// Native HTTPS client to bypass undici/Node global fetch connect timeout bugs on macOS
async function nativeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000
    };
    
    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch (e) {
          body = { message: data };
        }
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => body
        });
      });
    });
    
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

export default class CashfreeProvider {
  getAppId() {
    return process.env.CASHFREE_APP_ID;
  }

  getSecretKey() {
    return process.env.CASHFREE_SECRET_KEY;
  }

  getEnvironment() {
    return (process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  }

  getApiVersion() {
    return process.env.CASHFREE_API_VERSION || '2023-08-01';
  }

  isConfigured() {
    return !!(this.getAppId() && this.getSecretKey());
  }

  getBaseUrl() {
    return this.getEnvironment() === 'PRODUCTION'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  async createOrder(org, paymentRecord, outstandingAmount, resident) {
    if (!this.isConfigured()) {
      // Mock order for development
      const mockOrderId = 'order_simulated_' + Math.random().toString(36).substr(2, 9);
      const mockSessionId = 'session_mock_' + Math.random().toString(36).substr(2, 20);
      return {
        keyId: 'cf_mock_app_id',
        orderId: mockOrderId,
        paymentSessionId: mockSessionId,
        amount: outstandingAmount,
        currency: 'INR',
        paymentId: paymentRecord._id,
        isMock: true
      };
    }

    const orderId = 'cf_' + paymentRecord._id.toString() + '_' + Date.now();
    const returnUrl = (process.env.CASHFREE_RETURN_URL || 'http://localhost:5173/payment/result') + `?order_id=${orderId}`;

    const payload = {
      order_id: orderId,
      order_amount: Math.round(outstandingAmount * 100) / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: resident._id.toString(),
        customer_phone: resident.phone || '9999999999',
        customer_email: resident.email || 'tenant@stayzen.com',
        customer_name: resident.name
      },
      order_meta: {
        return_url: returnUrl
      }
    };

    // Apply Easy Split if organization has linkedAccountId configured
    if (org && org.gateway && org.gateway.linkedAccountId) {
      const landlordAmount = Math.round(outstandingAmount * 0.98 * 100) / 100;
      payload.order_splits = [
        {
          vendor_id: org.gateway.linkedAccountId,
          amount: landlordAmount
        }
      ];
    }

    const response = await nativeFetch(`${this.getBaseUrl()}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': this.getAppId(),
        'x-client-secret': this.getSecretKey(),
        'x-api-version': this.getApiVersion(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create Cashfree order');
    }

    return {
      keyId: this.getAppId(),
      orderId: result.order_id,
      paymentSessionId: result.payment_session_id,
      amount: result.order_amount,
      currency: result.order_currency,
      paymentId: paymentRecord._id
    };
  }

  async verifyPayment(org, payload, paymentRecord) {
    const { order_id } = payload;
    if (!order_id) {
      throw new Error('Cashfree order_id is required for verification.');
    }

    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Cashfree online gateway credentials are not configured in production.');
      }
      return { success: true, message: 'Mock payment verified successfully (Development Mode).' };
    }

    const response = await nativeFetch(`${this.getBaseUrl()}/orders/${order_id}`, {
      method: 'GET',
      headers: {
        'x-client-id': this.getAppId(),
        'x-client-secret': this.getSecretKey(),
        'x-api-version': this.getApiVersion()
      }
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch Cashfree order details');
    }

    if (result.order_status !== 'PAID') {
      throw new Error(`Cashfree order status is ${result.order_status}`);
    }

    // Get payment list to find the actual transaction ID
    const payListResponse = await nativeFetch(`${this.getBaseUrl()}/orders/${order_id}/payments`, {
      method: 'GET',
      headers: {
        'x-client-id': this.getAppId(),
        'x-client-secret': this.getSecretKey(),
        'x-api-version': this.getApiVersion()
      }
    });

    const payments = await payListResponse.json();
    const successfulPayment = Array.isArray(payments)
      ? payments.find(p => p.payment_status === 'SUCCESS')
      : null;

    return {
      success: true,
      message: 'Payment verified and recorded successfully.',
      cf_payment_id: successfulPayment?.cf_payment_id || 'cf_pay_verified',
      payment_method: successfulPayment?.payment_group || 'online_gateway',
      raw: result
    };
  }

  async handleWebhook(headers, rawBody) {
    const signature = headers['x-webhook-signature'];
    const timestamp = headers['x-webhook-timestamp'];
    const secretKey = this.getSecretKey();

    if (!secretKey) {
      throw new Error('Cashfree webhook secret key is not configured.');
    }

    if (!signature || !timestamp) {
      throw new Error('Missing Cashfree webhook signature or timestamp headers.');
    }

    // Validate timestamp freshness (prevent replay attacks, allow 5 minutes clock skew)
    const webhookTime = parseInt(timestamp, 10);
    if (isNaN(webhookTime)) {
      throw new Error('Invalid Cashfree webhook timestamp format.');
    }
    const currentTime = Date.now();
    // Cashfree timestamps can be in milliseconds or seconds
    const timeDiffMs = Math.abs(currentTime - (webhookTime < 1e12 ? webhookTime * 1000 : webhookTime));
    if (timeDiffMs > 5 * 60 * 1000) {
      throw new Error('Cashfree webhook timestamp is outside acceptable tolerance (replay protection).');
    }

    // Verify cryptographic HMAC-SHA256 signature against raw unparsed body
    const signatureData = timestamp + rawBody;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureData)
      .digest('base64');

    if (signature !== expectedSignature) {
      throw new Error('Cashfree webhook cryptographic signature verification failed.');
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new Error('Invalid JSON payload in Cashfree webhook.');
    }

    const { type, data } = body;

    if (type !== 'PAYMENT_SUCCESS_WEBHOOK') {
      // Safely ignore unhandled event types without error
      return { status: 'ignored', type };
    }

    const orderId = data.order?.order_id;
    const cfPaymentId = data.payment?.cf_payment_id;
    const paymentStatus = data.payment?.payment_status;
    const orderAmount = Number(data.order?.order_amount);

    if (!orderId || paymentStatus !== 'SUCCESS' || !cfPaymentId) {
      throw new Error('Invalid payment details in Cashfree success webhook.');
    }

    // Extract original payment ID if encoded in orderId
    const parts = orderId.split('_');
    const paymentRecordId = parts.length > 1 ? parts[1] : null;

    const queryOr = [{ gatewayOrderId: orderId }];
    if (paymentRecordId && mongoose.Types.ObjectId.isValid(paymentRecordId)) {
      queryOr.push({ _id: paymentRecordId });
    }

    const paymentRecord = await Payment.findOne({ $or: queryOr });

    if (!paymentRecord) {
      throw new Error(`Associated payment invoice not found for order ${orderId}.`);
    }

    // Validate expected amount against paid amount
    if (orderAmount && Math.abs(orderAmount - (paymentRecord.amount - (paymentRecord.receivedAmount || 0))) > 1 && paymentRecord.status !== 'paid') {
      console.warn(`[Webhook Warning] Paid amount ${orderAmount} differs from expected invoice balance ${paymentRecord.amount}`);
    }

    // Idempotency check: Check if transaction reference is already recorded
    const transactionExists = Array.isArray(paymentRecord.transactions) &&
      paymentRecord.transactions.some(tx => tx.referenceNumber === cfPaymentId);

    if (transactionExists || (paymentRecord.status === 'paid' && paymentRecord.gatewayPaymentId === cfPaymentId)) {
      return { status: 'already_processed', paymentId: paymentRecord._id };
    }

    const amount = paymentRecord.amount;
    const platformFee = Math.round(amount * 0.02 * 100) / 100;
    const ownerAmount = Math.round((amount - platformFee) * 100) / 100;

    const expSettlement = new Date();
    expSettlement.setDate(expSettlement.getDate() + 2);

    paymentRecord.status = 'paid';
    paymentRecord.paymentStatus = 'verified';
    paymentRecord.settlementStatus = 'processing';
    paymentRecord.paymentId = cfPaymentId;
    paymentRecord.platformFee = platformFee;
    paymentRecord.ownerAmount = ownerAmount;
    paymentRecord.expectedSettlementDate = expSettlement;
    paymentRecord.receivedAmount = amount;
    paymentRecord.method = 'online_gateway';
    paymentRecord.paidAt = new Date();
    paymentRecord.gatewayPaymentId = cfPaymentId;
    paymentRecord.gatewayOrderId = orderId;
    paymentRecord.provider = 'cashfree';
    paymentRecord.providerStatus = paymentStatus;
    paymentRecord.rawProviderReference = data;

    if (!paymentRecord.transactions) paymentRecord.transactions = [];
    paymentRecord.transactions.push({
      amount: amount,
      paidAt: new Date(),
      method: 'online_gateway',
      referenceNumber: cfPaymentId,
      notes: 'Paid online via Cashfree (Verified Webhook)'
    });

    if (!paymentRecord.history) paymentRecord.history = [];
    paymentRecord.history.push({
      action: 'payment_webhook_captured',
      timestamp: new Date(),
      details: { amount, cfPaymentId, orderId }
    });

    await paymentRecord.save();

    const resident = await Resident.findById(paymentRecord.residentId).lean();
    const residentName = resident?.name || 'Resident';

    await Notification.create({
      organizationId: paymentRecord.organizationId,
      title: 'Rent Payment Captured',
      message: `${residentName} has successfully paid ₹${new Intl.NumberFormat('en-IN').format(amount)} for ${paymentRecord.invoiceMonth} rent.`,
      type: 'payment',
      data: {
        paymentId: paymentRecord._id,
        amount,
        platformFee,
        ownerAmount,
        residentName
      }
    });

    return { status: 'processed', paymentId: paymentRecord._id };
  }

  async refundPayment(org, orderId, refundId, amount, note) {
    if (!this.isConfigured()) {
      return { success: true, status: 'MOCK_REFUNDED' };
    }

    const payload = {
      refund_amount: Math.round(amount * 100) / 100,
      refund_id: refundId || 'ref_' + Date.now(),
      refund_note: note || 'Refund for rent payment'
    };

    const response = await nativeFetch(`${this.getBaseUrl()}/orders/${orderId}/refunds`, {
      method: 'POST',
      headers: {
        'x-client-id': this.getAppId(),
        'x-client-secret': this.getSecretKey(),
        'x-api-version': this.getApiVersion(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to initiate Cashfree refund');
    }

    return { success: true, status: result.refund_status };
  }
}
