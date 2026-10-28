import { getStripe, isStripeSandboxKey } from '../_lib/stripe.js';
import {
  authenticateUser,
  getSupabaseAdmin,
  getTargetTables,
  isSandboxEnvironment,
} from '../_lib/supabaseAdmin.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { user, error: authError } = await authenticateUser(request, env);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Vous devez être connecté pour accéder au portail.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isSandbox = isSandboxEnvironment(env) || isStripeSandboxKey(env.STRIPE_SECRET_KEY);
    const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
    const tables = getTargetTables(env, isSandbox);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const { data: sub } = await supabaseAdmin
        .from(tables.subscriptions)
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      customerId = sub?.stripe_customer_id;
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Aucun compte client Stripe associé. Vous n’avez pas encore souscrit d’abonnement.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = getStripe(env);
    const reqUrl = new URL(request.url);
    const origin = request.headers.get('origin') || `${reqUrl.protocol}//${reqUrl.host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?tab=abonnement`,
    });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erreur customer-portal:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Impossible d’ouvrir le portail client Stripe pour le moment.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
