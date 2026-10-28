import { getStripe, PLANS } from '../_lib/stripe.js';
import {
  getSupabaseAdmin,
  syncSubscription,
  syncCommercialLicense,
  isEventProcessed,
  markEventProcessed,
} from '../_lib/supabaseAdmin.js';

/**
 * stripe-webhook.js
 * Réceptionnaire hautement sécurisé des webhooks Stripe sur Cloudflare Pages Functions :
 * - Validation cryptographique stricte et OBLIGATOIRE du corps brut (raw text) et de la signature Stripe.
 * - Aucune exécution sans signature valide (élimination totale de la faille de repli).
 * - Contrôle d'idempotence strict via la table Supabase `stripe_events`.
 * - Synchronisation automatique des abonnements et délivrance des licences commerciales ColorVIP Pro.
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

    // 1. Contrôle absolu de présence du secret et de la signature
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

    // 3. Contrôle d'idempotence
    const alreadyHandled = await isEventProcessed(event.id, env);
    if (alreadyHandled) {
      console.log(`Événement Stripe déjà traité (idempotent) : ${event.id} [${event.type}]`);
      return new Response(
        JSON.stringify({ received: true, idempotent: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Traitement événement Stripe : ${event.type} [${event.id}]`);

    // 4. Traitement des événements
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await handleSubscriptionUpdate(subscription, session.metadata, env, stripe);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription, {}, env, stripe);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription, env);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await handleSubscriptionUpdate(subscription, {}, env, stripe);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await handleSubscriptionPaymentFailed(subscription, env);
        }
        break;
      }

      default:
        console.log(`Événement Stripe non traité : ${event.type}`);
    }

    // 5. Marquer l'événement comme traité
    await markEventProcessed(event.id, event.type, env);

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

async function handleSubscriptionUpdate(sub, fallbackMeta = {}, env, stripe) {
  const supabaseAdmin = getSupabaseAdmin(env);

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

  const item = sub.items?.data?.[0];
  const price = item?.price;
  const unitAmount = price?.unit_amount || 0;
  const interval = price?.recurring?.interval || 'month';

  let planId = sub.metadata?.plan_id || price?.metadata?.plan_id;
  if (!planId) {
    if (unitAmount >= 4999 || unitAmount === 599) {
      planId = PLANS.COLORVIP_PRO;
    } else {
      planId = PLANS.COLORVIP;
    }
  }

  const periodStart = new Date(sub.current_period_start * 1000).toISOString();
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  const subData = {
    id: sub.id,
    user_id: userId,
    stripe_customer_id: customerId,
    status: sub.status,
    plan_id: planId,
    price_id: price?.id || '',
    interval,
    amount: unitAmount,
    currency: price?.currency || 'eur',
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  await syncSubscription(subData, env);

  // Synchronisation de la licence commerciale nominative pour ColorVIP Pro
  if (planId === PLANS.COLORVIP_PRO && ['active', 'trialing'].includes(sub.status)) {
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
      env
    );
  }
}

async function handleSubscriptionDeleted(sub, env) {
  const supabaseAdmin = getSupabaseAdmin(env);

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('id', sub.id)
    .maybeSingle();

  if (existingSub?.user_id) {
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_plan: null,
        subscription_status: 'canceled',
      })
      .eq('id', existingSub.user_id);

    await supabaseAdmin
      .from('licenses')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', sub.id);
  }
}

async function handleSubscriptionPaymentFailed(sub, env) {
  const supabaseAdmin = getSupabaseAdmin(env);

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('id', sub.id)
    .maybeSingle();

  if (existingSub?.user_id) {
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'past_due',
      })
      .eq('id', existingSub.user_id);
  }
}
