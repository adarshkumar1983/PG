import CashfreeProvider from './providers/CashfreeProvider.js';

class PaymentService {
  constructor() {
    this.providers = {
      cashfree: new CashfreeProvider()
    };
  }

  getProvider(providerName) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Payment provider "${providerName}" is not supported.`);
    }
    return provider;
  }

  async createOrder(org, paymentRecord, outstandingAmount, resident) {
    const providerName = org.gateway?.provider || 'none';
    if (providerName === 'none') {
      throw new Error('No online payment gateway is configured for this property.');
    }
    const provider = this.getProvider(providerName);
    return provider.createOrder(org, paymentRecord, outstandingAmount, resident);
  }

  async verifyPayment(org, payload, paymentRecord) {
    const providerName = org.gateway?.provider || 'none';
    if (providerName === 'none') {
      throw new Error('No online payment gateway is configured for this property.');
    }
    const provider = this.getProvider(providerName);
    return provider.verifyPayment(org, payload, paymentRecord);
  }

  async handleWebhook(providerName, headers, rawBody) {
    const provider = this.getProvider(providerName);
    return provider.handleWebhook(headers, rawBody);
  }

  async refundPayment(org, orderId, refundId, amount, note) {
    const providerName = org.gateway?.provider || 'none';
    if (providerName === 'none') {
      throw new Error('No online payment gateway is configured for this property.');
    }
    const provider = this.getProvider(providerName);
    return provider.refundPayment(org, orderId, refundId, amount, note);
  }
}

export default new PaymentService();
