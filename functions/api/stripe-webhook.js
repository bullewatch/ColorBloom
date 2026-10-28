import {
  getStripe,
  PLANS,
  getSubscriptionDates,
  getInvoiceSubscriptionId,
  getSubscriptionPlanInfo,
  isStripeSandboxKey,
} from '../_lib/stripe.js';
import {
  getSupabaseAdmin,
  syncSubscription,
  syncCommercialLicense,
  claimEvent,
  getTargetTables,
  isSandboxEnvironment,
} from '../_lib/supabaseAdmin.js';

/**
 * stripe-webhook.js
 * Réceptionnaire sécurisé des webhooks Stripe pour Cloudflare Pages Functions :
 * - Version API stable Stripe : 2026-09-30.endive
 * - Validation cryptographique stricte et obligatoire du corps brut et de la signature Stripe.
 * - Idempotence atomique stricte via table stripe_events pour éliminer tout risque de double traitement concurrent.
 * - Protection anti-désordre (out-of-order events) par récupération directe de l'état Stripe et contrôle des horodatages.
 * - Extraction résiliente des dates (items.data[0].current_period_start/end) sans aucune erreur RangeError.
 * - Référence des factures adaptée à la structure 2026-09-30.endive (invoice.parent.subscription_details.subscription).
 * - Isolation stricte des données sandbox (garde-fou protégeant les utilisateurs de production réels).
 * - Maintien des droits commerciaux jusqu'au terme de la période payée en cas d'annulation.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Corps de requête vide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
    const signature = request.headers.get('stripe-signature');

    // 1. Contrôle de présence du secret et de la signature
    if (!webhookSecret) {
      console.error('CRITIQUE : STRIPE_WEBHOOK_SECRET non configuré dans Cloudflare Pages.');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur incomplète (webhook secret manquant).' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'En-tête stripe-signature manquant.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = getStripe(env);

    // 2. Validation cryptographique obligatoire
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } catch (sigErr) {
      console.warn('Rejet webhook - Signature invalide :', sigErr.message);
      return new Response(
        JSON.stringify({ error: `Signature de webhook invalide : ${sigErr.message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!event || !event.id) {
      return new Response(
        JSON.stringify({ error: 'Événement Stripe invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Détection du mode Sandbox
    const isSandbox = event.livemode === false || isStripeSandboxKey(env.STRIPE_SECRET_KEY);

    // 3. Contrôle d'idempotence atomique (verrouille l'événement contre les requêtes simultanées)
    const { alreadyHandled } = await claimEvent(event.id, event.type, env, isSandbox);
    if (alreadyHandled) {
      console.log(`Événement Stripe déjà traité (idempotent) : ${event.id} [${event.type}]`);
      return new Response(
        JSON.stringify({ received: true, idempotent: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Traitement événement Stripe [${event.type}] (id: ${event.id}, sandbox: ${isSandbox})`);

    // 4. Traitement des événements du cycle de vie des abonnements
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subId);
          await handleSubscriptionUpdate(subscription, session.metadata, env, stripe, isSandbox, event.created);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.resumed': {
        const sub = event.data.object;
        // Récupération de l'état Stripe le plus récent pour parer à tout désordre réseau
        const freshSub = await stripe.subscriptions.retrieve(sub.id);
        await handleSubscriptionUpdate(freshSub, {}, env, stripe, isSandbox, event.created);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription, env, isSandbox, event.created);
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object;
        await handleSubscriptionPaused(subscription, env, isSandbox, event.created);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subId = getInvoiceSubscriptionId(invoice);
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          await handleSubscriptionUpdate(subscription, {}, env, stripe, isSandbox, event.created);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = getInvoiceSubscriptionId(invoice);
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          await handleSubscriptionPaymentFailed(subscription, env, isSandbox, event.created);
        }
        break;
      }

      default:
        console.log(`Événement Stripe sans action requise : ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erreur traitement webhook Stripe :', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne du webhook' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSubscriptionUpdate(sub, fallbackMeta = {}, env, stripe, isSandbox, eventCreated) {
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
  const tables = getTargetTables(env, isSandbox);

  let userId =
    sub.metadata?.user_id ||
    fallbackMeta?.user_id ||
    sub.subscription_data?.metadata?.user_id;

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

  if (!userId && customerId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    userId = profile?.id;
  }

  if (!userId) {
    console.error(`Impossible de relier l'abonnement ${sub.id} à un utilisateur Supabase.`);
    return;
  }

  const { price, priceId, unitAmount, interval, planId, currency } = getSubscriptionPlanInfo(sub);
  const { periodStart, periodEnd } = getSubscriptionDates(sub);

  const subData = {
    id: sub.id,
    user_id: userId,
    stripe_customer_id: customerId,
    status: sub.status,
    plan_id: planId,
    price_id: priceId,
    interval,
    amount: unitAmount,
    currency,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    updated_at: eventCreated ? new Date(eventCreated * 1000).toISOString() : new Date().toISOString(),
  };

  await syncSubscription(subData, env, { isSandbox });

  // Synchronisation de la licence commerciale nominative pour ColorVIP Pro
  // Si résiliation demandée (cancel_at_period_end = true), la licence reste active jusqu'à la fin de la période payée !
  const isLicensed = planId === PLANS.COLORVIP_PRO && ['active', 'trialing'].includes(sub.status);
  if (isLicensed) {
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();

    const customerName =
      sub.metadata?.customer_name ||
      fallbackMeta?.customer_name ||
      userProfile?.display_name ||
      'Membre Pro Colorblop';

    const customerEmail =
      sub.metadata?.customer_email ||
      fallbackMeta?.customer_email ||
      '';

    await syncCommercialLicense(
      {
        userId,
        subscriptionId: sub.id,
        customerName,
        customerEmail,
        interval,
        periodStart,
        periodEnd,
        status: 'active',
      },
      env,
      { isSandbox }
    );
  }
}

async function handleSubscriptionDeleted(sub, env, isSandbox, eventCreated) {
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
  const tables = getTargetTables(env, isSandbox);
  const ts = eventCreated ? new Date(eventCreated * 1000).toISOString() : new Date().toISOString();

  await supabaseAdmin
    .from(tables.subscriptions)
    .update({
      status: 'canceled',
      canceled_at: ts,
      updated_at: ts,
    })
    .eq('id', sub.id);

  const { data: existingSub } = await supabaseAdmin
    .from(tables.subscriptions)
    .select('user_id')
    .eq('id', sub.id)
    .maybeSingle();

  if (existingSub?.user_id) {
    if (!tables.isProductionProject || !isSandbox) {
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_plan: null,
          subscription_status: 'canceled',
        })
        .eq('id', existingSub.user_id);
    }

    await supabaseAdmin
      .from(tables.licenses)
      .update({
        status: 'expired',
        updated_at: ts,
      })
      .eq('subscription_id', sub.id);
  }
}

async function handleSubscriptionPaused(sub, env, isSandbox, eventCreated) {
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
  const tables = getTargetTables(env, isSandbox);
  const ts = eventCreated ? new Date(eventCreated * 1000).toISOString() : new Date().toISOString();

  await supabaseAdmin
    .from(tables.subscriptions)
    .update({
      status: 'paused',
      updated_at: ts,
    })
    .eq('id', sub.id);

  const { data: existingSub } = await supabaseAdmin
    .from(tables.subscriptions)
    .select('user_id')
    .eq('id', sub.id)
    .maybeSingle();

  if (existingSub?.user_id && (!tables.isProductionProject || !isSandbox)) {
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'paused',
      })
      .eq('id', existingSub.user_id);
  }
}

async function handleSubscriptionPaymentFailed(sub, env, isSandbox, eventCreated) {
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
  const tables = getTargetTables(env, isSandbox);
  const ts = eventCreated ? new Date(eventCreated * 1000).toISOString() : new Date().toISOString();

  await supabaseAdmin
    .from(tables.subscriptions)
    .update({
      status: 'past_due',
      updated_at: ts,
    })
    .eq('id', sub.id);

  const { data: existingSub } = await supabaseAdmin
    .from(tables.subscriptions)
    .select('user_id')
    .eq('id', sub.id)
    .maybeSingle();

  if (existingSub?.user_id) {
    if (!tables.isProductionProject || !isSandbox) {
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'past_due',
        })
        .eq('id', existingSub.user_id);
    }

    await supabaseAdmin
      .from(tables.licenses)
      .update({
        status: 'suspended',
        updated_at: ts,
      })
      .eq('subscription_id', sub.id);
  }
}
