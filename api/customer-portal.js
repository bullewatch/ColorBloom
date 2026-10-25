import { getStripe } from './_lib/stripe.js';
import { authenticateUser, supabaseAdmin } from './_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: 'Vous devez être connecté pour accéder au portail.' });
    }

    // Récupérer le stripe_customer_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Vérifier dans la table subscriptions
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      customerId = sub?.stripe_customer_id;
    }

    if (!customerId) {
      return res.status(404).json({
        error: 'Aucun compte client Stripe associé. Vous n’avez pas encore souscrit d’abonnement.',
      });
    }

    const stripe = getStripe();
    const origin =
      req.headers.origin ||
      (req.headers.host ? `https://${req.headers.host}` : 'https://colorblop.com');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?tab=abonnement`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error('Erreur customer-portal:', err);
    return res.status(500).json({
      error: err.message || 'Impossible d’ouvrir le portail client Stripe pour le moment.',
    });
  }
}
