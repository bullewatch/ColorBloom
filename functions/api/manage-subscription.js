import { getStripe } from '../_lib/stripe.js';
import { authenticateUser, getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

/**
 * manage-subscription.js
 * Gestion de l'abonnement en libre-service (arrêt ou reprise du renouvellement automatique),
 * sans jamais obliger l'utilisateur à se connecter à Stripe.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { user, error: authError } = await authenticateUser(request, env);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Vous devez être connecté pour gérer votre abonnement.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (!['cancel', 'reactivate'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Action invalide. Attendu : "cancel" ou "reactivate".' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isOwner =
      user.email?.toLowerCase() === 'flo83119@gmail.com' ||
      user.id === 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

    if (isOwner) {
      return new Response(
        JSON.stringify({
          success: true,
          isOwner: true,
          cancel_at_period_end: false,
          message: 'Accès Propriétaire Colorblop permanent.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = getSupabaseAdmin(env);

    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr || !sub) {
      return new Response(
        JSON.stringify({ error: 'Aucun abonnement actif trouvé pour votre compte.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = getStripe(env);
    const shouldCancel = action === 'cancel';

    // Mise à jour directe sur l'API Stripe
    const updatedSub = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: shouldCancel,
    });

    const periodEnd = new Date(updatedSub.current_period_end * 1000).toISOString();

    // Synchronisation dans Supabase
    await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: shouldCancel,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id);

    return new Response(
      JSON.stringify({
        success: true,
        cancel_at_period_end: shouldCancel,
        current_period_end: periodEnd,
        message: shouldCancel
          ? `Le renouvellement automatique a bien été arrêté. Vos téléchargements SVG restent actifs jusqu'au ${new Date(periodEnd).toLocaleDateString('fr-FR')}. Vous ne serez plus débité.`
          : 'Le renouvellement automatique a été réactivé avec succès. Votre abonnement se prolongera normalement.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erreur manage-subscription:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Une erreur est survenue lors de la mise à jour de votre abonnement.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
