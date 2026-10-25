import { getStripe, PLANS, INTERVALS } from './_lib/stripe.js';
import {
  supabaseAdmin,
  syncSubscription,
  syncCommercialLicense,
  isEventProcessed,
  markEventProcessed,
} from './_lib/supabaseAdmin.js';

// Vercel Serverless: désactiver le bodyParser natif pour obtenir le buffer brut nécessaire à la validation de la signature
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const rawBody = await getRawBody(req);
    if (!rawBody || rawBody.length === 0) {
      return res.status(400).json({ error: 'Corps de requête vide.' });
    }

    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers['stripe-signature'];

    let event;
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      console.warn('⚠️ Webhook exécuté sans vérification de signature.');
      event = JSON.parse(rawBody.toString('utf8'));
    }

    if (!event || !event.id) {
      return res.status(400).json({ error: 'Événement Stripe invalide.' });
    }

    // 1. Contrôle d'idempotence
    const alreadyHandled = await isEventProcessed(event.id);
    if (alreadyHandled) {
      console.log(`Événement Stripe déjà traité (idempotent): ${event.id} (${event.type})`);
      return res.status(200).json({ received: true, idempotent: true });
    }

    console.log(`Traitement événement Stripe: ${event.type} [${event.id}]`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await handleSubscriptionUpdate(subscription, session.metadata);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await handleSubscriptionUpdate(subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await handleSubscriptionPaymentFailed(subscription);
        }
        break;
      }

      default:
        console.log(`Événement Stripe ignoré: ${event.type}`);
    }

    // Marquer l'événement comme traité
    await markEventProcessed(event.id, event.type);

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Erreur webhook Stripe [${event?.type || 'unknown'}]:`, err);
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Traite la création ou mise à jour d'un abonnement Stripe.
 */
async function handleSubscriptionUpdate(sub, fallbackMeta = {}) {
  // Retrouver l'user_id Supabase
  let userId =
    sub.metadata?.user_id ||
    fallbackMeta?.user_id ||
    sub.subscription_data?.metadata?.user_id;

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

  if (!userId && customerId) {
    // Retrouver par customerId dans profiles
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

  // Déterminer la formule (ColorVIP ou ColorVIP Pro)
  let planId = sub.metadata?.plan_id || price?.metadata?.plan_id;
  if (!planId) {
    // Déduction basée sur le tarif
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
    status: sub.status, // 'active', 'trialing', 'past_due', etc.
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

  await syncSubscription(subData);

  // Si c'est ColorVIP Pro, créer ou synchroniser la licence commerciale
  if (planId === PLANS.COLORVIP_PRO && ['active', 'trialing'].includes(sub.status)) {
    // Récupérer le nom et email du client
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    const customerName =
      sub.metadata?.customer_name ||
      fallbackMeta?.customer_name ||
      userProfile?.display_name ||
      'Membre Pro Colorblop';

    const customerEmail =
      sub.metadata?.customer_email ||
      fallbackMeta?.customer_email ||
      '';

    await syncCommercialLicense({
      userId,
      subscriptionId: sub.id,
      customerName,
      customerEmail,
      interval,
      periodStart,
      periodEnd,
      status: 'active',
    });
  }
}

/**
 * Traite la résiliation ou suppression effective d'un abonnement.
 */
async function handleSubscriptionDeleted(sub) {
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  // Récupérer l'user_id
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

    // Mettre à jour la licence commerciale en expirée
    await supabaseAdmin
      .from('licenses')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', sub.id);
  }
}

/**
 * Traite un échec de paiement.
 */
async function handleSubscriptionPaymentFailed(sub) {
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
