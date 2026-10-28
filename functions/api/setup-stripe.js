import { getStripe, ensureStripeProductsAndPrices } from '../_lib/stripe.js';
import { authenticateUser } from '../_lib/supabaseAdmin.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { user } = await authenticateUser(request, env);
    const isOwner =
      user?.email?.toLowerCase() === 'flo83119@gmail.com' ||
      user?.id === 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

    // Seul le propriétaire est autorisé à exécuter la configuration Stripe
    if (!isOwner) {
      return new Response(
        JSON.stringify({ error: 'Accès strictement restreint à l’administrateur propriétaire.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = getStripe(env);
    const result = await ensureStripeProductsAndPrices(stripe);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Produits et tarifs Stripe configurés avec succès sans doublons.',
        ...result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erreur setup-stripe:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
