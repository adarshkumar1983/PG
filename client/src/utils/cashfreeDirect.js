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
  try {
    const scriptLoaded = await loadCashfreeScript();
    if (!scriptLoaded) {
      throw new Error("Cashfree SDK failed to load. Check your internet connection.");
    }

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
