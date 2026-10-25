import { getStripe, ensureStripeProductsAndPrices, PLANS, INTERVALS } from './_lib/stripe.js';
import { authenticateUser, supabaseAdmin } from './_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    // 1. Authentification
    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: 'Vous devez être connecté pour vous abonner.' });
    }

    const { planId, interval } = req.body || {};
    if (![PLANS.COLORVIP, PLANS.COLORVIP_PRO].includes(planId)) {
      return res.status(400).json({ error: 'Formule d’abonnement invalide.' });
    }
    if (![INTERVALS.MONTH, INTERVALS.YEAR].includes(interval)) {
      return res.status(400).json({ error: 'Périodicité invalide (month ou year attendu).' });
    }

    const stripe = getStripe();

    // 2. Vérifier ou créer les produits et prix dans Stripe
    const { prices } = await ensureStripeProductsAndPrices(stripe);
    const targetPriceKey = `${planId}_${interval}`;
    const priceId = prices[targetPriceKey];

    if (!priceId) {
      return res.status(500).json({ error: `Tarif introuvable pour ${planId} (${interval}).` });
    }

    // 3. Récupérer ou créer le client Stripe
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Chercher si un client avec cet email existe déjà sur Stripe
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile?.display_name || user.email.split('@')[0],
          metadata: {
            supabase_uid: user.id,
            app: 'colorblop',
          },
        });
        customerId = customer.id;
      }

      // Sauvegarder dans profiles
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // 4. Déterminer l'URL d'origine
    const origin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : 'https://colorblop.com');

    // 5. Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
          interval,
          customer_email: user.email,
          customer_name: profile?.display_name || user.email.split('@')[0],
        },
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
        interval,
      },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Erreur create-checkout-session:', err);
    return res.status(500).json({
      error: err.message || 'Une erreur est survenue lors de la création de la session Stripe.',
    });
  }
}
