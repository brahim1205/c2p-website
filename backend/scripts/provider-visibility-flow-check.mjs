const API_URL = process.env.API_URL || 'http://localhost:3003/api';
const PASSWORD = process.env.C2P_PASSWORD || ['password', '123'].join('');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractCookies(response) {
  const setCookies = response.headers.getSetCookie?.() || [];
  return setCookies.map((cookie) => cookie.split(';', 1)[0]);
}

function mergeCookieJar(...cookieSets) {
  return cookieSets.flat().filter(Boolean).join('; ');
}

function readCookie(cookieJar, name) {
  const prefix = `${name}=`;
  return cookieJar
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || null;
}

async function loginAs(email) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  assert(response.ok, `login failed for ${email} (${response.status})`);
  const cookieJar = mergeCookieJar(extractCookies(response));
  return {
    cookieJar,
    csrfToken: readCookie(cookieJar, 'c2p_csrf'),
  };
}

async function request(path, init = {}) {
  return fetch(`${API_URL}${path}`, init);
}

async function readJson(path, init = {}) {
  const response = await request(path, init);
  const payload = await response.json();
  return { response, payload };
}

async function main() {
  const { cookieJar, csrfToken } = await loginAs('prestataire@c2p.sn');
  assert(csrfToken, 'missing csrf cookie for prestataire');

  const beforePasses = await readJson('/data/provider_visibility_passes?order=issued_at&ascending=false', {
    headers: { Cookie: cookieJar },
  });
  assert(beforePasses.response.ok, `expected 200 on initial visibility passes, got ${beforePasses.response.status}`);
  assert(Array.isArray(beforePasses.payload) && beforePasses.payload.length > 0, 'expected seeded visibility pass');
  assert(
    beforePasses.payload.every((row) => String(row.user_id) === 'usr-prestataire'),
    'prestataire must only receive own visibility passes',
  );

  const latestBefore = beforePasses.payload[0];
  const latestBeforeIssuedAt = String(latestBefore.issued_at ?? '');

  const visibilityProducts = await readJson('/payments/provider-visibility/products', {
    headers: { Cookie: cookieJar },
  });
  assert(visibilityProducts.response.ok, `expected 200 on visibility products, got ${visibilityProducts.response.status}`);
  assert(Array.isArray(visibilityProducts.payload) && visibilityProducts.payload.length >= 2, 'expected SenPresta visibility products');

  const beforeOrders = await readJson('/payments/provider-visibility/orders/me', {
    headers: { Cookie: cookieJar },
  });
  assert(beforeOrders.response.ok, `expected 200 on initial visibility orders, got ${beforeOrders.response.status}`);
  const initialOrderCount = Array.isArray(beforeOrders.payload) ? beforeOrders.payload.length : 0;

  const wallet = await readJson('/payments/wallet/me', {
    headers: { Cookie: cookieJar },
  });
  assert(wallet.response.ok, `expected 200 on provider wallet, got ${wallet.response.status}`);
  if (Number(wallet.payload.available_balance ?? wallet.payload.balance ?? 0) < 150_000) {
    const topup = await readJson('/payments/wallet/topup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieJar,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        amount: 250_000,
        method: 'wave',
        description: 'Recharge technique pour test provider visibility',
      }),
    });
    assert(topup.response.ok, `expected 200 on provider wallet topup, got ${topup.response.status}`);
  }

  const renewed = await readJson('/payments/subscriptions/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      plan_id: 'plan-prestataire-premium',
      auto_renew: true,
      renew_now: true,
    }),
  });
  assert(renewed.response.ok, `expected 200 on subscription renew, got ${renewed.response.status}`);
  assert(String(renewed.payload.subscription?.plan_id) === 'plan-prestataire-premium', 'renewed subscription must keep premium plan');

  const afterPasses = await readJson('/data/provider_visibility_passes?order=issued_at&ascending=false', {
    headers: { Cookie: cookieJar },
  });
  assert(afterPasses.response.ok, `expected 200 on refreshed visibility passes, got ${afterPasses.response.status}`);
  assert(Array.isArray(afterPasses.payload) && afterPasses.payload.length >= beforePasses.payload.length, 'visibility pass list should be preserved');

  const latestAfter = afterPasses.payload[0];
  assert(String(latestAfter.status) === 'active', 'latest visibility pass must be active');
  assert(String(latestAfter.plan_id) === 'plan-prestataire-premium', 'latest visibility pass must target premium plan');
  assert(String(latestAfter.user_id) === 'usr-prestataire', 'latest visibility pass must belong to prestataire');
  assert(String(latestAfter.issued_at ?? '') !== latestBeforeIssuedAt, 'renewal must issue a fresh visibility pass');
  assert(String(latestAfter.code ?? '') !== '', 'visibility pass code must be present');

  const purchaseRequestId = `provider-visibility-smoke-${Date.now()}`;
  const purchased = await readJson('/payments/provider-visibility/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
      'X-Request-Id': purchaseRequestId,
    },
    body: JSON.stringify({
      product_id: 'visprod-premium-30',
      idempotency_key: purchaseRequestId,
    }),
  });
  assert(purchased.response.ok, `expected 200 on visibility purchase, got ${purchased.response.status}`);
  assert(String(purchased.payload.order?.product_id) === 'visprod-premium-30', 'purchased visibility order must target premium product');
  assert(String(purchased.payload.order?.user_id) === 'usr-prestataire', 'visibility order must belong to prestataire');
  assert(String(purchased.payload.pass?.source_type ?? '') === 'provider_visibility_order', 'explicit purchase must emit order-backed pass');
  assert(String(purchased.payload.pass?.product_id ?? '') === 'visprod-premium-30', 'emitted pass must target premium product');
  assert(String(purchased.payload.pass?.code ?? '') !== '', 'purchased pass must expose a code');

  const replayedPurchase = await readJson('/payments/provider-visibility/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
      'X-Request-Id': purchaseRequestId,
    },
    body: JSON.stringify({
      product_id: 'visprod-premium-30',
      idempotency_key: purchaseRequestId,
    }),
  });
  assert(replayedPurchase.response.ok, `expected 200 on idempotent visibility purchase replay, got ${replayedPurchase.response.status}`);
  assert(
    String(replayedPurchase.payload.order?.id) === String(purchased.payload.order?.id),
    'idempotent visibility purchase replay must return the same order',
  );
  assert(
    String(replayedPurchase.payload.pass?.id) === String(purchased.payload.pass?.id),
    'idempotent visibility purchase replay must return the same pass',
  );

  const afterOrders = await readJson('/payments/provider-visibility/orders/me', {
    headers: { Cookie: cookieJar },
  });
  assert(afterOrders.response.ok, `expected 200 on refreshed visibility orders, got ${afterOrders.response.status}`);
  assert(Array.isArray(afterOrders.payload) && afterOrders.payload.length === initialOrderCount + 1, 'visibility order list must grow after purchase');
  assert(String(afterOrders.payload[0]?.product_id ?? '') === 'visprod-premium-30', 'latest visibility order must be premium');
  assert(String(afterOrders.payload[0]?.pass_code ?? '') !== '', 'visibility order must expose emitted pass code');

  const afterPurchasedPasses = await readJson('/payments/provider-visibility/passes/me', {
    headers: { Cookie: cookieJar },
  });
  assert(afterPurchasedPasses.response.ok, `expected 200 on refreshed visibility passes, got ${afterPurchasedPasses.response.status}`);
  assert(Array.isArray(afterPurchasedPasses.payload) && afterPurchasedPasses.payload.length > 0, 'visibility pass list must not be empty after purchase');
  assert(String(afterPurchasedPasses.payload[0]?.source_type ?? '') === 'provider_visibility_order', 'latest pass must come from explicit purchase');

  const createdRequest = await readJson('/marketplace/prestataire/verification-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      provider_id: 1,
      note: 'Demande smoke de vérification SenPresta.',
    }),
  });
  assert(
    createdRequest.response.ok || createdRequest.response.status === 409,
    `expected 200 or 409 on verification request create, got ${createdRequest.response.status}`,
  );
  if (createdRequest.response.ok) {
    assert(String(createdRequest.payload.status) === 'pending', 'verification request must start pending');
    assert(String(createdRequest.payload.user_id) === 'usr-prestataire', 'verification request must belong to prestataire');
  }

  const duplicateRequest = await request('/marketplace/prestataire/verification-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      provider_id: 1,
      note: 'Doublon interdit.',
    }),
  });
  assert(duplicateRequest.status === 409, `expected 409 on duplicate verification request, got ${duplicateRequest.status}`);

  const verificationRequests = await readJson('/data/provider_verification_requests?order=requested_at&ascending=false', {
    headers: { Cookie: cookieJar },
  });
  assert(verificationRequests.response.ok, `expected 200 on visibility request list, got ${verificationRequests.response.status}`);
  assert(Array.isArray(verificationRequests.payload) && verificationRequests.payload.length > 0, 'verification request list must not be empty');
  assert(
    verificationRequests.payload.every((row) => String(row.user_id) === 'usr-prestataire'),
    'prestataire must only receive own verification requests',
  );

  console.log('provider-visibility-flow-check: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
