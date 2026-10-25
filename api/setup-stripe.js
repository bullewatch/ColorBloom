import { getStripe, ensureStripeProductsAndPrices } from './_lib/stripe.js';
import { authenticateUser } from './_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { user } = await authenticateUser(req);
    const isOwner = user?.email?.toLowerCase() === 'flo83119@gmail.com' || user?.id === 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

    // Seul le propriétaire ou un appel en mode setup peut déclencher la configuration
    if (!isOwner && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Accès restreint à l’administrateur.' });
    }

    const stripe = getStripe();
    const result = await ensureStripeProductsAndPrices(stripe);

    return res.status(200).json({
      success: true,
      message: 'Produits et tarifs Stripe configurés avec succès sans doublons.',
      ...result,
    });
  } catch (err) {
    console.error('Erreur setup-stripe:', err);
    return res.status(500).json({ error: err.message });
  }
}
