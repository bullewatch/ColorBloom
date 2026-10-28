import {
  getStripe,
  ensureStripeProductsAndPrices,
  PLANS,
  INTERVALS,
  isStripeSandboxKey,
} from '../_lib/stripe.js';
import {
  authenticateUser,
  getSupabaseAdmin,
  getUserSubscription,
  resolveSupabaseCredentials,
  isSandboxEnvironment,
} from '../_lib/supabaseAdmin.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Authentification obligatoire
    const { user, error: authError } = await authenticateUser(request, env);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Vous devez être connecté pour vous abonner.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { planId, interval, customerName } = body;

    // 2. Validation stricte des données d'entrée
    if (![PLANS.COLORVIP, PLANS.COLORVIP_PRO].includes(planId)) {
      return new Response(
        JSON.stringify({ error: 'Formule d’abonnement invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (![INTERVALS.MONTH, INTERVALS.YEAR].includes(interval)) {
      return new Response(
        JSON.stringify({ error: 'Périodicité invalide (month ou year attendu).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isSandbox = isSandboxEnvironment(env) || isStripeSandboxKey(env.STRIPE_SECRET_KEY);
    const creds = resolveSupabaseCredentials(env, isSandbox);
    const verifiedCustomerName = customerName?.trim() || null;
    const stripe = getStripe(env);
    const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });

    // 3. Vérification d'abonnement existant pour éviter les doublons accidentels
    const existingSub = await getUserSubscription(user.id, env, { isSandbox });
    if (existingSub && ['active', 'trialing'].includes(existingSub.status)) {
      const isSamePlan = existingSub.plan_id === planId && existingSub.interval === interval;
      if (isSamePlan && !existingSub.cancel_at_period_end) {
        return new Response(
          JSON.stringify({
            error: `Vous bénéficiez déjà d'un abonnement actif à ${planId === PLANS.COLORVIP_PRO ? 'ColorVIP Pro' : 'ColorVIP'} (${interval === 'year' ? 'Annuel' : 'Mensuel'}).`,
            alreadySubscribed: true,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Tarifs Stripe (garantie d'existence sans doublons)
    const { prices } = await ensureStripeProductsAndPrices(stripe);
    const targetPriceKey = `${planId}_${interval}`;
    const priceId = prices[targetPriceKey];

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Tarif introuvable pour ${planId} (${interval}).` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Récupération ou création du client Stripe
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    // En mode Sandbox face à la base de production, ne pas réutiliser le customer ID réel
    if (isSandbox && customerId && !customerId.startsWith('cus_test_')) {
      customerId = null;
    }

    if (!customerId) {
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
            sandbox: isSandbox ? 'true' : 'false',
          },
        });
        customerId = customer.id;
      }

      // FAIL-CLOSED STRICT : Ne JAMAIS altérer la table profiles de production en Sandbox
      if (!creds.isProductionProject || !isSandbox) {
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      } else {
        console.warn(`[FAIL-CLOSED PROFILES] Écriture de stripe_customer_id évitée sur le profil de production ${user.id} en Sandbox.`);
      }
    }

    // 6. Déterminer l'URL d'origine
    const reqUrl = new URL(request.url);
    const origin = request.headers.get('origin') || `${reqUrl.protocol}//${reqUrl.host}`;
    const finalCustomerName = verifiedCustomerName || profile?.display_name || user.email.split('@')[0];

    // FAIL-CLOSED STRICT : Ne pas modifier display_name dans la table profiles de production en Sandbox
    if (verifiedCustomerName && verifiedCustomerName !== profile?.display_name) {
      if (!creds.isProductionProject || !isSandbox) {
        await supabaseAdmin
          .from('profiles')
          .update({ display_name: verifiedCustomerName })
          .eq('id', user.id);
      } else {
        console.warn(`[FAIL-CLOSED PROFILES] Modification de display_name évitée sur le profil de production en Sandbox.`);
      }
    }

    // 7. Création de la session Stripe Checkout (Stripe API 2026-09-30.endive)
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
          customer_name: finalCustomerName,
          sandbox: isSandbox ? 'true' : 'false',
        },
      },
      metadata: {
        user_id: user.id,
        plan_id: planId,
        interval,
        customer_name: finalCustomerName,
        sandbox: isSandbox ? 'true' : 'false',
      },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erreur create-checkout-session:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Une erreur est survenue lors de la création de la session Stripe.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
