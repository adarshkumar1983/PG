/**
 * Dynamically loads the Cashfree checkout SDK if not already present.
 */
export const loadCashfreeScript = () => {
  return new Promise((resolve) => {
    if (window.Cashfree) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initiates the Cashfree checkout process:
 * 1. Loads the SDK.
 * 2. Opens the Cashfree Checkout Modal.
 */
export const processCashfreePayment = async ({
  paymentId,
  session,
  amountLabel,
  onSuccess = () => {},
  onFailure = () => {},
  onProgress = () => {}
}) => {
  onProgress(true, "Initializing gateway...");
  try {
    const scriptLoaded = await loadCashfreeScript();
    if (!scriptLoaded) {
      throw new Error("Cashfree SDK failed to load. Check your internet connection.");
    }

    onProgress(true, "Creating Cashfree order...");
    const orderResponse = await fetch(`/api/tenant/payments/${paymentId}/initiate-charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'x-organization-id': session.organizationId
      }
    });

    const orderData = await orderResponse.json();
    if (!orderResponse.ok) {
      throw new Error(orderData.message || "Failed to create order on server.");
    }

    onProgress(true, "Awaiting payment...");

    const isMock = orderData.isMock;
    const mode = (isMock || orderData.keyId?.startsWith('TEST') || orderData.keyId?.startsWith('cf_mock')) ? 'sandbox' : 'production';
    
    const cashfree = window.Cashfree({ mode });

    const checkoutOptions = {
      paymentSessionId: orderData.paymentSessionId,
      redirectTarget: "_modal"
    };

    cashfree.checkout(checkoutOptions).then(async (result) => {
      if (result.error) {
        onFailure(result.error.message || "Checkout failed");
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
    });
  } catch (err) {
    onFailure(err.message || "An error occurred during payment setup.");
    onProgress(false, "");
  }
};
