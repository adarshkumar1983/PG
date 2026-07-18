/**
 * Dynamically loads the Razorpay checkout.js script if not already present
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initiates the payment process:
 * 1. Loads Razorpay script
 * 2. Fetches order_id from our backend
 * 3. Opens the Razorpay Checkout Modal
 * 4. Sends payment details back to backend for cryptographic signature verification
 */
export const processOnlinePayment = async ({
  paymentId,
  session,
  amountLabel,
  pgName = "StayZen Residency",
  onSuccess = () => {},
  onFailure = () => {},
  onProgress = () => {}
}) => {
  onProgress(true, "Initializing gateway...");
  try {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error("Razorpay SDK failed to load. Check your internet connection.");
    }

    onProgress(true, "Creating order...");
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

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: pgName,
      description: `Rent payment / dues for invoice: ${amountLabel}`,
      order_id: orderData.orderId,
      handler: async (response) => {
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
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyResponse.json();
          if (!verifyResponse.ok) {
            throw new Error(verifyData.message || "Payment signature verification failed.");
          }

          onSuccess(verifyData.message || "Payment completed successfully!");
        } catch (err) {
          onFailure(err.message || "Verification failed.");
        } finally {
          onProgress(false, "");
        }
      },
      prefill: {
        name: session.name || "",
        email: session.email || "",
      },
      notes: {
        paymentId: orderData.paymentId
      },
      theme: {
        color: "#17644f" // Match StayZen green theme
      },
      modal: {
        ondismiss: () => {
          onProgress(false, "");
          onFailure("Payment cancelled by user.");
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    onFailure(err.message || "An error occurred during payment setup.");
    onProgress(false, "");
  }
};
