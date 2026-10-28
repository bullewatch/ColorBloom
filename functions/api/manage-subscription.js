import {
  getStripe,
  PLANS,
  INTERVALS,
  getSubscriptionDates,
  ensureStripeProductsAndPrices,
  isStripeSandboxKey,
} from '../_lib/stripe.js';
import {
  authenticateUser,
  getSupabaseAdmin,
  syncSubscription,
  syncCommercialLicense,
  getTargetTables,
  isSandboxEnvironment,
} from '../_lib/supabaseAdmin.js';

/**
 * manage-subscription.js
 * Gestion de l'abonnement en libre-service (Stripe API 2026-09-30.endive) :
 * - Arrêt ou reprise du renouvellement automatique (cancel_at_period_end)
 * - Changement de formule et de périodicité (upgrade/downgrade immédiat avec calcul de prorata)
 * - Maintien effectif des téléchargements et droits commerciaux jusqu'à la fin de la période payée
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
    const { action, newPlanId, newInterval } = body;

    if (!['cancel', 'reactivate', 'change_plan'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Action invalide. Attendu : "cancel", "reactivate" ou "change_plan".' }),
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

    const isSandbox = isSandboxEnvironment(env) || isStripeSandboxKey(env.STRIPE_SECRET_KEY);
    const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
    const tables = getTargetTables(env, isSandbox);

    const { data: sub, error: subErr } = await supabaseAdmin
      .from(tables.subscriptions)
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

    // CAS 1 : CHANGEMENT DE FORFAIT OU D'INTERVALLE (Upgrade / Downgrade avec prorata)
    if (action === 'change_plan') {
      if (![PLANS.COLORVIP, PLANS.COLORVIP_PRO].includes(newPlanId)) {
        return new Response(
          JSON.stringify({ error: 'Nouvelle formule d’abonnement invalide.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (![INTERVALS.MONTH, INTERVALS.YEAR].includes(newInterval)) {
        return new Response(
          JSON.stringify({ error: 'Nouvelle périodicité invalide (month ou year attendu).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { prices } = await ensureStripeProductsAndPrices(stripe);
      const targetPriceId = prices[`${newPlanId}_${newInterval}`];
      if (!targetPriceId) {
        return new Response(
          JSON.stringify({ error: `Tarif introuvable pour ${newPlanId} (${newInterval}).` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Récupérer l'abonnement Stripe actuel pour avoir l'id du premier item
      const currentStripeSub = await stripe.subscriptions.retrieve(sub.id);
      const firstItemId = currentStripeSub.items?.data?.[0]?.id;

      if (!firstItemId) {
        return new Response(
          JSON.stringify({ error: 'Élément d’abonnement Stripe introuvable.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Mise à jour de l'abonnement dans Stripe avec prorata automatique
      const updatedSub = await stripe.subscriptions.update(sub.id, {
        items: [
          {
            id: firstItemId,
            price: targetPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
        metadata: {
          user_id: user.id,
          plan_id: newPlanId,
          interval: newInterval,
        },
      });

      const { periodStart, periodEnd } = getSubscriptionDates(updatedSub);
      const updatedItem = updatedSub.items?.data?.[0];
      const newAmount = updatedItem?.price?.unit_amount || 0;

      const updatedSubData = {
        id: updatedSub.id,
        user_id: user.id,
        stripe_customer_id: sub.stripe_customer_id,
        status: updatedSub.status,
        plan_id: newPlanId,
        price_id: targetPriceId,
        interval: newInterval,
        amount: newAmount,
        currency: updatedItem?.price?.currency || 'eur',
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: Boolean(updatedSub.cancel_at_period_end),
        updated_at: new Date().toISOString(),
      };

      await syncSubscription(updatedSubData, env, { isSandbox });

      // Si passage à ColorVIP Pro, délivrance / synchronisation de la licence commerciale
      if (newPlanId === PLANS.COLORVIP_PRO && ['active', 'trialing'].includes(updatedSub.status)) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle();

        await syncCommercialLicense(
          {
            userId: user.id,
            subscriptionId: updatedSub.id,
            customerName: userProfile?.display_name || 'Membre Pro Colorblop',
            customerEmail: user.email,
            interval: newInterval,
            periodStart,
            periodEnd,
            status: 'active',
          },
          env,
          { isSandbox }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          plan_id: newPlanId,
          interval: newInterval,
          current_period_end: periodEnd,
          message: `Votre abonnement a été modifié avec succès vers ${newPlanId === PLANS.COLORVIP_PRO ? 'ColorVIP Pro' : 'ColorVIP'} (${newInterval === 'year' ? 'Annuel' : 'Mensuel'}).`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // CAS 2 : ARRÊT OU REPRISE DU RENOUVELLEMENT AUTOMATIQUE
    const shouldCancel = action === 'cancel';

    // Mise à jour sur l'API Stripe (2026-09-30.endive)
    const updatedSub = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: shouldCancel,
    });

    const { periodEnd } = getSubscriptionDates(updatedSub);

    // Synchronisation dans Supabase
    await supabaseAdmin
      .from(tables.subscriptions)
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
          ? `Le renouvellement automatique a bien été arrêté. Vos téléchargements SVG restent pleinement actifs jusqu'au ${new Date(periodEnd).toLocaleDateString('fr-FR')}. Vous ne serez plus débité.`
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
