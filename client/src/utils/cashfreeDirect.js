import { loadCashfreeScript } from './cashfree.js';

export const processCashfreePaymentDirect = async ({
  orderData,
  session,
  amountLabel,
  onSuccess = () => {},
  onFailure = () => {},
  onProgress = () => {}
}) => {
  onProgress(true, "Awaiting payment...");

  // Handle mock/development simulation
  if (orderData.isMock || orderData.paymentSessionId?.startsWith('session_mock_')) {
    onProgress(true, "Processing simulated checkout (Demo mode)...");
    setTimeout(async () => {
      try {
        const verifyResponse = await fetch('/api/tenant/payments/verify-online-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
            'x-organization-id': session.organizationId
          },
          body: JSON.stringify({
            paymentId: orderData.paymentId,
            order_id: orderData.orderId,
            cf_payment_id: 'cf_simulated_' + Date.now()
          })
        });

        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) {
          throw new Error(verifyData.message || "Simulation failed.");
        }

        onSuccess(verifyData.message || "Payment completed successfully (Demo mode)!");
      } catch (err) {
        onFailure(err.message || "Simulated payment failed.");
      } finally {
        onProgress(false, "");
      }
    }, 1200);
    return;
  }

  try {
    const scriptLoaded = await loadCashfreeScript();
    if (!scriptLoaded) {
      throw new Error("Cashfree SDK failed to load. Check your internet connection or CSP settings.");
    }

    const mode = (orderData.keyId?.startsWith('TEST') || orderData.environment === 'SANDBOX') ? 'sandbox' : 'production';
    
    if (!window.Cashfree) {
      throw new Error("Cashfree SDK is not available in window object.");
    }

    const cashfree = window.Cashfree({ mode });

    const checkoutOptions = {
      paymentSessionId: orderData.paymentSessionId,
      redirectTarget: "_modal"
    };

    cashfree.checkout(checkoutOptions).then(async (result) => {
      if (!result) {
        onProgress(false, "");
        return;
      }

      if (result.error) {
        onFailure(result.error.message || "Checkout cancelled or failed.");
        onProgress(false, "");
        return;
      }
      
      onProgress(true, "Verifying transaction...");
      try {
        const verifyResponse = await fetch('/api/tenant/payments/verify-online-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
            'x-organization-id': session.organizationId
          },
          body: JSON.stringify({
            paymentId: orderData.paymentId,
            order_id: orderData.orderId
          })
        });

        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) {
          throw new Error(verifyData.message || "Payment verification failed.");
        }

        onSuccess(verifyData.message || "Payment completed successfully!");
      } catch (err) {
        onFailure(err.message || "Verification failed.");
      } finally {
        onProgress(false, "");
      }
    }).catch((err) => {
      onFailure(err?.message || "Cashfree checkout dismissed.");
      onProgress(false, "");
    });
  } catch (err) {
    onFailure(err.message || "An error occurred during payment setup.");
    onProgress(false, "");
  }
};
