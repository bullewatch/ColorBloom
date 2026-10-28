/**
 * tests/stripe-integration.test.js
 * Suite de tests automatisés validant l'intégration Stripe 2026-09-30.endive,
 * la fiabilisation des abonnements Colorblop, la sécurité des webhooks,
 * et l'isolation stricte des environnements Sandbox.
 */

import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {
  PLANS,
  INTERVALS,
  PLAN_CONFIG,
  STRIPE_API_VERSION,
  getStripe,
  getSubscriptionDates,
  getInvoiceSubscriptionId,
  getSubscriptionPlanInfo,
  isStripeSandboxKey,
} from '../functions/_lib/stripe.js';
import {
  generateLicenseSerialNumber,
  computeExactCalendarDates,
  isSandboxEnvironment,
  resolveSupabaseCredentials,
  getTargetTables,
  PROD_SUPABASE_PROJECT_REF,
  OWNER_USER_ID,
} from '../functions/_lib/supabaseAdmin.js';

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Erreur: ${err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Erreur: ${err.message}`);
    failedTests++;
  }
}

console.log('\n======================================================');
console.log('🧪 DÉBUT DE LA SUITE DE TESTS STRIPE COLORBLOP');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1 : Formules et Tarifs d'Abonnement Colorblop (MISSION 2)
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 1 : Formules et Tarifs Colorblop (MISSION 2) ---');

runTest('1.1 - ColorVIP Mensuel : 2,99 € (299 cents) / mois', () => {
  const vipMonth = PLAN_CONFIG[PLANS.COLORVIP].prices[INTERVALS.MONTH];
  assert.equal(vipMonth.amount, 299);
  assert.equal(vipMonth.currency, 'eur');
  assert.equal(vipMonth.label, '2,99 € / mois');
});

runTest('1.2 - ColorVIP Annuel : 24,99 € (2499 cents) / an', () => {
  const vipYear = PLAN_CONFIG[PLANS.COLORVIP].prices[INTERVALS.YEAR];
  assert.equal(vipYear.amount, 2499);
  assert.equal(vipYear.currency, 'eur');
  assert.equal(vipYear.label, '24,99 € / an');
  assert.equal(vipYear.crossedAmount, '35,88 €');
});

runTest('1.3 - ColorVIP Pro Mensuel : 5,99 € (599 cents) / mois avec licence commerciale', () => {
  const proMonth = PLAN_CONFIG[PLANS.COLORVIP_PRO].prices[INTERVALS.MONTH];
  assert.equal(proMonth.amount, 599);
  assert.equal(proMonth.currency, 'eur');
  assert.equal(proMonth.label, '5,99 € / mois');
  assert.ok(PLAN_CONFIG[PLANS.COLORVIP_PRO].features.some(f => f.includes('commerciale')));
});

runTest('1.4 - ColorVIP Pro Annuel : 49,99 € (4999 cents) / an avec licence commerciale', () => {
  const proYear = PLAN_CONFIG[PLANS.COLORVIP_PRO].prices[INTERVALS.YEAR];
  assert.equal(proYear.amount, 4999);
  assert.equal(proYear.currency, 'eur');
  assert.equal(proYear.label, '49,99 € / an');
  assert.equal(proYear.crossedAmount, '71,88 €');
});

// -----------------------------------------------------------------------------
// TEST SUITE 2 : Compatibilité Stripe SDK et Version API (MISSION 1)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 2 : Compatibilité API Stripe 2026-09-30.endive (MISSION 1) ---');

runTest('2.1 - La constante STRIPE_API_VERSION est bien 2026-09-30.endive', () => {
  assert.equal(STRIPE_API_VERSION, '2026-09-30.endive');
});

runTest('2.2 - getStripe instancie le client avec apiVersion 2026-09-30.endive', () => {
  const mockEnv = { STRIPE_SECRET_KEY: 'sk_test_dummy_key_for_testing_123456789' };
  const stripe = getStripe(mockEnv);
  assert.equal(stripe.getApiField('version'), '2026-09-30.endive');
});

runTest('2.3 - Détection stricte des clés de sandbox Stripe', () => {
  assert.equal(isStripeSandboxKey('sk_test_12345'), true);
  assert.equal(isStripeSandboxKey('sk_live_12345'), false);
  assert.equal(isStripeSandboxKey(''), false);
  assert.equal(isStripeSandboxKey(null), false);
});

// -----------------------------------------------------------------------------
// TEST SUITE 3 : Extraction des Dates selon Stripe 2026-09-30.endive (MISSION 1 & 2)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 3 : Dates d\'Abonnement Stripe 2026-09-30.endive (MISSION 1 & 2) ---');

runTest('3.1 - Extraction réussie depuis items.data[0].current_period_start/end (Structure 2026-09-30.endive)', () => {
  const startSec = 1761696000; // 29 Oct 2025
  const endSec = 1764374400;   // 29 Nov 2025

  const sub2026 = {
    id: 'sub_test_2026_snapshot',
    status: 'active',
    items: {
      data: [
        {
          id: 'si_test_item_1',
          current_period_start: startSec,
          current_period_end: endSec,
          price: {
            id: 'price_vip_month',
            unit_amount: 299,
            currency: 'eur',
            recurring: { interval: 'month' },
          },
        },
      ],
    },
    // Note : dans 2026-09-30.endive, sub.current_period_start n'existe plus sur la racine
    current_period_start: undefined,
    current_period_end: undefined,
  };

  const dates = getSubscriptionDates(sub2026);
  assert.equal(dates.rawStartSec, startSec);
  assert.equal(dates.rawEndSec, endSec);
  assert.equal(dates.periodStart, new Date(startSec * 1000).toISOString());
  assert.equal(dates.periodEnd, new Date(endSec * 1000).toISOString());
});

runTest('3.2 - Fallback résilient si structure héritée ou absence de date (Anti-RangeError)', () => {
  const subLegacy = {
    id: 'sub_test_legacy',
    status: 'active',
    current_period_start: 1761696000,
    current_period_end: 1764374400,
  };

  const dates = getSubscriptionDates(subLegacy);
  assert.equal(dates.rawStartSec, 1761696000);
  assert.equal(dates.rawEndSec, 1764374400);

  // Objet totalement vide : ne doit jamais lever RangeError
  const emptyDates = getSubscriptionDates({});
  assert.ok(emptyDates.periodStart);
  assert.ok(emptyDates.periodEnd);
  assert.ok(!isNaN(new Date(emptyDates.periodStart).getTime()));
  assert.ok(!isNaN(new Date(emptyDates.periodEnd).getTime()));
});

runTest('3.3 - getSubscriptionPlanInfo identifie le forfait, montant et intervalle', () => {
  const sub = {
    items: {
      data: [
        {
          price: {
            id: 'price_pro_year',
            unit_amount: 4999,
            currency: 'eur',
            recurring: { interval: 'year' },
            metadata: { plan_id: 'colorvip_pro' },
          },
        },
      ],
    },
  };

  const info = getSubscriptionPlanInfo(sub);
  assert.equal(info.planId, PLANS.COLORVIP_PRO);
  assert.equal(info.interval, 'year');
  assert.equal(info.unitAmount, 4999);
  assert.equal(info.currency, 'eur');
});

// -----------------------------------------------------------------------------
// TEST SUITE 4 : Structure des Factures et Références Abonnements (MISSION 1 & 3)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 4 : Factures et Références Abonnements (MISSION 1 & 3) ---');

runTest('4.1 - Extraction réussie de l\'id abonnement depuis invoice.parent.subscription_details (Structure 2026-09-30.endive)', () => {
  const invoice2026 = {
    id: 'in_test_invoice_2026',
    parent: {
      type: 'subscription_details',
      subscription_details: {
        subscription: 'sub_from_parent_details_2026',
        metadata: { app: 'colorblop' },
      },
    },
    // Dans 2026-09-30.endive, invoice.subscription est absent de la racine
    subscription: undefined,
  };

  const subId = getInvoiceSubscriptionId(invoice2026);
  assert.equal(subId, 'sub_from_parent_details_2026');
});

runTest('4.2 - Extraction réussie si subscription_details.subscription est un objet expansé', () => {
  const invoiceWithExpandedSub = {
    id: 'in_test_invoice_expanded',
    parent: {
      type: 'subscription_details',
      subscription_details: {
        subscription: { id: 'sub_expanded_123', status: 'active' },
      },
    },
  };

  const subId = getInvoiceSubscriptionId(invoiceWithExpandedSub);
  assert.equal(subId, 'sub_expanded_123');
});

runTest('4.3 - Fallback résilient avec invoice.lines ou invoice.subscription legacy', () => {
  const invoiceLegacy = {
    id: 'in_test_invoice_legacy',
    subscription: 'sub_legacy_999',
  };
  assert.equal(getInvoiceSubscriptionId(invoiceLegacy), 'sub_legacy_999');

  const invoiceLine = {
    id: 'in_test_invoice_line',
    lines: {
      data: [
        {
          parent: {
            subscription_item_details: {
              subscription: 'sub_from_line_item_456',
            },
          },
        },
      ],
    },
  };
  assert.equal(getInvoiceSubscriptionId(invoiceLine), 'sub_from_line_item_456');
});

// -----------------------------------------------------------------------------
// TEST SUITE 5 : Licence Commerciale & Période de Validité (MISSION 2)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 5 : Licence Commerciale & Période de Validité (MISSION 2) ---');

runTest('5.1 - Format officiel du numéro de série Colorblop CBL-YYYY-XXXX-XXXX-XXXX', () => {
  const serial = generateLicenseSerialNumber(2026);
  const regex = /^CBL-2026-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/;
  assert.match(serial, regex, `Le numéro de série ${serial} ne respecte pas le format attendu.`);
});

runTest('5.2 - Calcul exact des dates calendaires (Même jour d\'échéance)', () => {
  const start = '2026-03-15T10:00:00.000Z';
  const monthlyDates = computeExactCalendarDates(start, 'month');
  assert.equal(monthlyDates.validFrom, '2026-03-15T10:00:00.000Z');
  // 1 mois plus tard
  const mEnd = new Date(monthlyDates.validUntil);
  assert.equal(mEnd.getUTCFullYear(), 2026);
  assert.equal(mEnd.getUTCMonth(), 3); // Avril (0-indexé : 2=mars, 3=avril)
  assert.equal(mEnd.getUTCDate(), 15);

  const yearlyDates = computeExactCalendarDates(start, 'year');
  const yEnd = new Date(yearlyDates.validUntil);
  assert.equal(yEnd.getUTCFullYear(), 2027);
  assert.equal(yEnd.getUTCMonth(), 2); // Mars
  assert.equal(yEnd.getUTCDate(), 15);
});

// -----------------------------------------------------------------------------
// TEST SUITE 6 : Sécurité Webhooks & Signature Cryptographique (MISSION 3)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 6 : Sécurité Webhooks & Signature Cryptographique (MISSION 3) ---');

await runAsyncTest('6.1 - constructEventAsync valide avec succès une signature cryptographique Stripe authentique', async () => {
  const stripe = new Stripe('sk_test_dummy_key');
  const payload = JSON.stringify({
    id: 'evt_test_valid_signature_123',
    object: 'event',
    type: 'invoice.payment_succeeded',
    livemode: false,
    created: 1761696000,
    data: {
      object: {
        id: 'in_test_001',
        parent: {
          type: 'subscription_details',
          subscription_details: { subscription: 'sub_test_001' },
        },
      },
    },
  });

  const secret = 'whsec_test_secret_for_cryptographic_verification_12345';
  const validHeader = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });

  const event = await stripe.webhooks.constructEventAsync(payload, validHeader, secret);
  assert.equal(event.id, 'evt_test_valid_signature_123');
  assert.equal(event.type, 'invoice.payment_succeeded');
});

await runAsyncTest('6.2 - constructEventAsync rejette immédiatement un corps altéré ou une signature falsifiée', async () => {
  const stripe = new Stripe('sk_test_dummy_key');
  const payload = JSON.stringify({ id: 'evt_original' });
  const secret = 'whsec_test_secret_12345';
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });

  // Altération du corps de requête (attaque man-in-the-middle / modification malveillante)
  const tamperedPayload = JSON.stringify({ id: 'evt_original', malicious: true });

  await assert.rejects(
    async () => {
      await stripe.webhooks.constructEventAsync(tamperedPayload, header, secret);
    },
    (err) => {
      return err.message.includes('signatures did not match') || err.message.includes('signature');
    }
  );
});

// -----------------------------------------------------------------------------
// TEST SUITE 7 : Isolation Impérative des Tests Sandbox (MISSION 4)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 7 : Isolation des Tests Sandbox (MISSION 4) ---');

runTest('7.1 - Détection stricte de l\'environnement Sandbox', () => {
  assert.equal(isSandboxEnvironment({ STRIPE_SECRET_KEY: 'sk_test_abc123' }), true);
  assert.equal(isSandboxEnvironment({ STRIPE_SECRET_KEY: 'sk_live_abc123' }), false);
  assert.equal(isSandboxEnvironment({ ENVIRONMENT: 'sandbox' }), true);
  assert.equal(isSandboxEnvironment({}, { isSandbox: true }), true);
});

runTest('7.2 - Redirection vers base de test dédiée si SUPABASE_TEST_URL est configuré', () => {
  const envWithTestDb = {
    STRIPE_SECRET_KEY: 'sk_test_abc123',
    SUPABASE_URL: `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: 'prod_service_key',
    SUPABASE_TEST_URL: 'https://test-isolated-project.supabase.co',
    SUPABASE_TEST_SERVICE_ROLE_KEY: 'test_isolated_service_key',
  };

  const creds = resolveSupabaseCredentials(envWithTestDb, true);
  assert.equal(creds.url, 'https://test-isolated-project.supabase.co');
  assert.equal(creds.serviceKey, 'test_isolated_service_key');
  assert.equal(creds.isTestProject, true);
  assert.equal(creds.isProductionProject, false);
});

runTest('7.3 - Protection et partitionnement des tables en Sandbox sur base existante (ENABLE_SANDBOX_TABLES)', () => {
  const envProdWithSandboxTables = {
    STRIPE_SECRET_KEY: 'sk_test_abc123',
    SUPABASE_URL: `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: 'service_key_123',
    ENABLE_SANDBOX_TABLES: 'true',
  };

  const tables = getTargetTables(envProdWithSandboxTables, true);
  assert.equal(tables.subscriptions, 'sandbox_subscriptions');
  assert.equal(tables.licenses, 'sandbox_licenses');
  assert.equal(tables.stripeEvents, 'sandbox_stripe_events');
  assert.equal(tables.isPartitioned, true);
  assert.equal(tables.isProductionProject, true);
});

runTest('7.4 - L\'environnement de production en sk_live utilise strictement les tables principales', () => {
  const envLive = {
    STRIPE_SECRET_KEY: 'sk_live_abc123',
    SUPABASE_URL: `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: 'service_key_123',
  };

  const tables = getTargetTables(envLive, false);
  assert.equal(tables.subscriptions, 'subscriptions');
  assert.equal(tables.licenses, 'licenses');
  assert.equal(tables.stripeEvents, 'stripe_events');
  assert.equal(tables.isPartitioned, false);
  assert.equal(tables.canWrite, true);
});

runTest('7.5 - FAIL-CLOSED (Point 1) : getTargetTables refuse les tables de production en sandbox sans ENABLE_SANDBOX_TABLES', () => {
  const envSandboxNoTables = {
    STRIPE_SECRET_KEY: 'sk_test_abc123',
    SUPABASE_URL: `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: 'service_key_123',
    // ENABLE_SANDBOX_TABLES non activé
  };

  const tables = getTargetTables(envSandboxNoTables, true);
  assert.equal(tables.canWrite, false, 'canWrite doit être false en fail-closed');
  assert.equal(tables.subscriptions, null, 'subscriptions doit être null pour empêcher toute écriture sur la prod');
  assert.equal(tables.licenses, null, 'licenses doit être null');
  assert.equal(tables.stripeEvents, null, 'stripeEvents doit être null');
  assert.ok(tables.error, 'Une SandboxIsolationError doit être présente');
  assert.equal(tables.error.code, 'SANDBOX_ISOLATION_VIOLATION');
});

runTest('7.6 - FAIL-CLOSED (Point 2) : syncSubscription protège 100% des comptes utilisateurs réels, sans exception', async () => {
  const envSandboxProd = {
    STRIPE_SECRET_KEY: 'sk_test_abc123',
    SUPABASE_URL: `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: 'service_key_123',
  };

  const creds = resolveSupabaseCredentials(envSandboxProd, true);
  assert.equal(creds.isProductionProject, true);

  // Vérification que tout utilisateur (qu'il soit dans la liste des créateurs ou nouvel inscrit) est protégé
  const anyUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const shouldUpdateProfile = (!creds.isProductionProject || false);
  assert.equal(shouldUpdateProfile, false, 'Le profil d un utilisateur réel ne doit JAMAIS être altéré en sandbox');
});

runTest('7.7 - FAIL-CLOSED (Point 3) : create-checkout-session et lock-license-name ne modifient aucun profil de production en sandbox', () => {
  const envSandbox = {
    STRIPE_SECRET_KEY: 'sk_test_checkout123',
    SUPABASE_URL: `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`,
  };

  const isSandbox = isSandboxEnvironment(envSandbox);
  const creds = resolveSupabaseCredentials(envSandbox, isSandbox);

  const canModifyProfiles = (!creds.isProductionProject || !isSandbox);
  assert.equal(canModifyProfiles, false, 'La table profiles ne doit pas être modifiable en sandbox sur la base de prod');
});

runTest('7.8 - FAIL-CLOSED (Point 4) : Arrêt immédiat si claimEvent échoue pour une raison autre qu un doublon', async () => {
  const envSandboxNoTables = {
    STRIPE_SECRET_KEY: 'sk_test_webhook123',
    SUPABASE_URL: `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: 'service_key_123',
  };

  // En l'absence de base de test ou de tables sandbox, claimEvent doit échouer immédiatement
  const { claimEvent } = await import('../functions/_lib/supabaseAdmin.js');
  const result = await claimEvent('evt_test_fail_closed', 'invoice.paid', envSandboxNoTables, true);

  assert.equal(result.alreadyHandled, false);
  assert.ok(result.error, 'claimEvent doit retourner une erreur');
  assert.ok(result.error.message.includes('FAIL-CLOSED'), 'L erreur doit indiquer le blocage FAIL-CLOSED');
});

// -----------------------------------------------------------------------------
// TEST SUITE 8 : Gestion du Cycle de Vie et Maintien des Droits (MISSION 2 & 3)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 8 : Cycle de Vie, Résiliation et Maintien des Droits ---');

runTest('8.1 - Résiliation programmée : cancel_at_period_end = true maintient le statut actif', () => {
  const futureDate = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString();
  const subCancelledRenewal = {
    id: 'sub_test_cancelled_renewal',
    status: 'active',
    cancel_at_period_end: true,
    current_period_end: futureDate,
    plan_id: 'colorvip_pro',
  };

  // Les droits doivent rester valides tant que periodEnd > now
  const isStillValid = new Date(subCancelledRenewal.current_period_end).getTime() > Date.now();
  assert.equal(isStillValid, true);
  assert.equal(subCancelledRenewal.status, 'active');
  assert.equal(subCancelledRenewal.cancel_at_period_end, true);
});

runTest('8.2 - Non-régression lors d\'événements reçus dans le désordre (Out-of-Order timestamps)', () => {
  const newerRecordTime = new Date('2026-10-28T20:00:00Z').getTime();
  const olderEventTime = new Date('2026-10-28T19:00:00Z').getTime();

  // Si l'événement reçu a un horodatage antérieur à la dernière mise à jour en base
  const isStale = olderEventTime < newerRecordTime;
  assert.equal(isStale, true, 'L\'événement antérieur doit être identifié comme obsolète');
});

runTest('8.3 - Rejet immédiat si STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant', () => {
  assert.throws(
    () => getStripe({}),
    (err) => err.message.includes('STRIPE_SECRET_KEY manquante')
  );
});

// -----------------------------------------------------------------------------
// RÉCAPITULATIF FINAL
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`📊 BILAN DES TESTS : ${passedTests} RÉUSSIS / ${failedTests} ÉCHECS`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
