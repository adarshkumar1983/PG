import assert from 'assert';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, headers: res.headers, data };
}

async function runSecurityTests() {
  console.log('====================================================');
  console.log('🔒 RUNNING PRODUCTION SECURITY REGRESSION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Password Reset Token Leak & Enumeration Protection
  await test('Auth: /api/auth/forgot-password does NOT return devResetLink or token', async () => {
    const res = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'owner@stayzen.demo' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.devResetLink, undefined, 'devResetLink MUST NOT be returned in response');
    assert.strictEqual(typeof res.data.message, 'string');
    assert.ok(res.data.message.includes('If the email is registered'));
  });

  await test('Auth: /api/auth/forgot-password returns identical response for non-existent email', async () => {
    const res = await request('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'non_existent_random_user_9988@domain.invalid' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.devResetLink, undefined);
    assert.ok(res.data.message.includes('If the email is registered'));
  });

  await test('Auth: /api/auth/reset-password rejects invalid/forged reset token', async () => {
    const res = await request('/api/auth/reset-password', {
      method: 'POST',
      body: { token: 'invalid_fake_token_1234567890', password: 'newSecurePassword123' }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.data.message.includes('Invalid or expired reset token'));
  });

  // 2. Webhook Authentication & Replay Protection
  await test('Webhook: Reject Cashfree webhook without signature header', async () => {
    const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'order_test' } } });
    const res = await request('/api/webhooks/cashfree', {
      method: 'POST',
      body: rawBody
    });
    assert.strictEqual(res.status, 400, 'Webhook must be rejected with 400 when signature is missing');
  });

  await test('Webhook: Reject Cashfree webhook without timestamp header', async () => {
    const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'order_test' } } });
    const res = await request('/api/webhooks/cashfree', {
      method: 'POST',
      headers: { 'x-webhook-signature': 'fake_signature_abc' },
      body: rawBody
    });
    assert.strictEqual(res.status, 400, 'Webhook must be rejected with 400 when timestamp is missing');
  });

  await test('Webhook: Reject Cashfree webhook with expired timestamp (replay attack)', async () => {
    const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'order_test' } } });
    const oldTimestamp = String(Date.now() - (10 * 60 * 1000)); // 10 minutes old
    const res = await request('/api/webhooks/cashfree', {
      method: 'POST',
      headers: {
        'x-webhook-signature': 'fake_signature_abc',
        'x-webhook-timestamp': oldTimestamp
      },
      body: rawBody
    });
    assert.strictEqual(res.status, 400, 'Webhook must be rejected with 400 when timestamp is expired');
  });

  await test('Webhook: Reject Cashfree webhook with invalid cryptographic signature', async () => {
    const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'order_test' } } });
    const currentTimestamp = String(Date.now());
    const res = await request('/api/webhooks/cashfree', {
      method: 'POST',
      headers: {
        'x-webhook-signature': 'forged_invalid_signature_hash',
        'x-webhook-timestamp': currentTimestamp
      },
      body: rawBody
    });
    assert.strictEqual(res.status, 400, 'Webhook must be rejected with 400 when signature is invalid');
  });

  // 3. Security Headers
  await test('Headers: Helmet security headers are present on API responses', async () => {
    const res = await request('/api/health');
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff', 'X-Content-Type-Options header missing');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN', 'X-Frame-Options header missing');
  });

  // 4. Legacy Mock Endpoints Disabled
  await test('Endpoints: Legacy unauthenticated /api/dashboard and /api/residents endpoints are removed', async () => {
    const resDash = await request('/api/dashboard');
    assert.strictEqual(resDash.status, 404, '/api/dashboard must return 404 in production');

    const resRes = await request('/api/residents', { method: 'POST', body: { name: 'Test' } });
    assert.strictEqual(resRes.status, 404, '/api/residents must return 404 in production');
  });

  // 5. Tenant Authorization & Unauthenticated Access
  await test('Tenant: Protected route /api/tenant/residents requires authentication', async () => {
    const res = await request('/api/tenant/residents');
    assert.strictEqual(res.status, 401, 'Unauthenticated request must be rejected with 401');
  });

  await test('Tenant: Protected route /api/tenant/payments requires authentication', async () => {
    const res = await request('/api/tenant/payments');
    assert.strictEqual(res.status, 401, 'Unauthenticated request must be rejected with 401');
  });

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests();
