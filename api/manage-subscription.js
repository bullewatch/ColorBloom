import { getStripe } from './_lib/stripe.js';
import { authenticateUser, supabaseAdmin, getUserSubscription } from './_lib/supabaseAdmin.js';

/**
 * Gère l'abonnement directement depuis Colorblop (arrêt ou reprise du renouvellement automatique),
 * sans jamais exiger que l'utilisateur crée ou accède à un compte Stripe.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    // 1. Authentification
    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: 'Vous devez être connecté pour gérer votre abonnement.' });
    }

    const { action } = req.body || {};
    if (!['cancel', 'reactivate'].includes(action)) {
      return res.status(400).json({ error: 'Action invalide. Attendu : "cancel" ou "reactivate".' });
    }

    const isOwner = user.email?.toLowerCase() === 'flo83119@gmail.com' || user.id === 'efd85ff7-77c2-4508-9493-156c58bbc9fa';
    if (isOwner) {
      return res.status(200).json({
        success: true,
        isOwner: true,
        cancel_at_period_end: false,
        message: 'Accès Propriétaire Colorblop permanent.',
      });
    }

    // 2. Récupérer l'abonnement actif dans Supabase
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr || !sub) {
      return res.status(404).json({ error: 'Aucun abonnement actif trouvé pour votre compte.' });
    }

    const stripe = getStripe();
    const shouldCancel = action === 'cancel';

    // 3. Mettre à jour l'abonnement dans Stripe
    // cancel_at_period_end = true arrête le renouvellement sans couper les accès
    // cancel_at_period_end = false réactive le renouvellement automatique
    const updatedSub = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: shouldCancel,
    });

    const periodEnd = new Date(updatedSub.current_period_end * 1000).toISOString();

    // 4. Mettre à jour dans Supabase
    await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: shouldCancel,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id);

    return res.status(200).json({
      success: true,
      cancel_at_period_end: shouldCancel,
      current_period_end: periodEnd,
      message: shouldCancel
        ? `Le renouvellement automatique a bien été arrêté. Vos téléchargements SVG restent actifs jusqu'au ${new Date(periodEnd).toLocaleDateString('fr-FR')}. Vous ne serez plus débité.`
        : 'Le renouvellement automatique a été réactivé avec succès. Votre abonnement se prolongera normalement.',
    });
  } catch (err) {
    console.error('Erreur manage-subscription:', err);
    return res.status(500).json({
      error: err.message || 'Une erreur est survenue lors de la mise à jour de votre abonnement.',
    });
  }
}
