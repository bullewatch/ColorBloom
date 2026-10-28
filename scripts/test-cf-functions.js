import { onRequest as middleware } from '../functions/api/_middleware.js';
import { onRequestGet as subscriptionStatus } from '../functions/api/subscription-status.js';
import { onRequestPost as createCheckout } from '../functions/api/create-checkout-session.js';
import { onRequestPost as stripeWebhook } from '../functions/api/stripe-webhook.js';
import { onRequestGet as downloadSvg } from '../functions/api/download-svg.js';
import { onRequestPost as lockLicenseName } from '../functions/api/lock-license-name.js';
import { onRequestPost as manageSubscription } from '../functions/api/manage-subscription.js';

async function runTests() {
  console.log('🧪 Lancement de la suite de tests unitaires Cloudflare Pages Functions...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [TEST ${total}] ${message}`);
      passed++;
    } else {
      console.error(`❌ [TEST ${total}] ÉCHEC : ${message}`);
    }
  }

  const dummyEnv = {
    VITE_SUPABASE_URL: 'https://jlyzoxqihqofvsfyqwsw.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test_service_role_key',
    STRIPE_SECRET_KEY: 'sk_test_dummy',
    STRIPE_WEBHOOK_SECRET: 'whsec_dummy',
  };

  // Test 1 : Middleware OPTIONS preflight CORS
  {
    const req = new Request('https://colorblop.pages.dev/api/subscription-status', {
      method: 'OPTIONS',
      headers: { Origin: 'https://colorblop.pages.dev' },
    });
    const res = await middleware({ request: req, next: () => {} });
    assert(res.status === 204, 'Middleware répond 204 aux requêtes OPTIONS (CORS)');
    assert(
      res.headers.get('Access-Control-Allow-Origin') === 'https://colorblop.pages.dev',
      'Middleware injecte Access-Control-Allow-Origin sur pages.dev'
    );
  }

  // Test 2 : Middleware bloquant un robot scanner suspect
  {
    const req = new Request('https://colorblop.pages.dev/api/create-checkout-session', {
      method: 'POST',
      headers: { 'User-Agent': 'sqlmap/1.5#dev' },
    });
    const res = await middleware({ request: req, next: () => {} });
    assert(res.status === 403, 'Middleware bloque immédiatement un robot malveillant (403)');
  }

  // Test 3 : subscription-status sans token
  {
    const req = new Request('https://colorblop.pages.dev/api/subscription-status', {
      method: 'GET',
    });
    const res = await subscriptionStatus({ request: req, env: dummyEnv });
    assert(res.status === 200, 'subscription-status répond 200 pour un visiteur anonyme');
    const data = await res.json();
    assert(data.isAuthenticated === false && data.canDownloadSvg === false, 'subscription-status indique non connecté & téléchargement SVG interdit');
  }

  // Test 4 : create-checkout-session sans token
  {
    const req = new Request('https://colorblop.pages.dev/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'colorvip', interval: 'month' }),
    });
    const res = await createCheckout({ request: req, env: dummyEnv });
    assert(res.status === 401, 'create-checkout-session rejette avec 401 un utilisateur non connecté');
  }

  // Test 5 : stripe-webhook sans signature
  {
    const req = new Request('https://colorblop.pages.dev/api/stripe-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'evt_test_123', type: 'customer.subscription.created' }),
    });
    const res = await stripeWebhook({ request: req, env: dummyEnv });
    assert(res.status === 400, 'stripe-webhook rejette avec 400 une requête sans header stripe-signature');
  }

  // Test 6 : stripe-webhook avec signature invalide
  {
    const req = new Request('https://colorblop.pages.dev/api/stripe-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1234567,v1=fake_signature',
      },
      body: JSON.stringify({ id: 'evt_test_123' }),
    });
    const res = await stripeWebhook({ request: req, env: dummyEnv });
    assert(res.status === 400, 'stripe-webhook rejette avec 400 une signature cryptographique invalide (faille comblée)');
  }

  // Test 7 : download-svg sans token
  {
    const req = new Request('https://colorblop.pages.dev/api/download-svg?id=animal-1', {
      method: 'GET',
    });
    const res = await downloadSvg({ request: req, env: dummyEnv });
    assert(res.status === 401, 'download-svg exige une authentification (401 si aucun token)');
  }

  // Test 8 : lock-license-name sans token
  {
    const req = new Request('https://colorblop.pages.dev/api/lock-license-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jean Dupont', nameConfirm: 'Jean Dupont' }),
    });
    const res = await lockLicenseName({ request: req, env: dummyEnv });
    assert(res.status === 401, 'lock-license-name exige une authentification (401)');
  }

  // Test 9 : manage-subscription sans token
  {
    const req = new Request('https://colorblop.pages.dev/api/manage-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    const res = await manageSubscription({ request: req, env: dummyEnv });
    assert(res.status === 401, 'manage-subscription exige une authentification (401)');
  }

  console.log(`\n📊 Résultats : ${passed}/${total} tests validés avec succès ! 🚀`);
  if (passed !== total) process.exit(1);
}

runTests().catch(err => {
  console.error('Erreur exécution tests:', err);
  process.exit(1);
});
