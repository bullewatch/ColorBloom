import { isStripeSandboxKey } from '../_lib/stripe.js';
import {
  authenticateUser,
  getSupabaseAdmin,
  getUserSubscription,
  getTargetTables,
  isSandboxEnvironment,
} from '../_lib/supabaseAdmin.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const { user, error: authErr } = await authenticateUser(request, env);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({
          isAuthenticated: false,
          hasActiveSubscription: false,
          canDownloadSvg: false,
          subscription: null,
          license: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isOwner =
      user.email?.toLowerCase() === 'flo83119@gmail.com' ||
      user.id === 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

    const isSandbox = isSandboxEnvironment(env) || isStripeSandboxKey(env.STRIPE_SECRET_KEY);
    const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
    const tables = getTargetTables(env, isSandbox);

    // 1. Abonnement actif en base
    const subscription = await getUserSubscription(user.id, env, { isSandbox });
    const hasActiveSub = Boolean(
      subscription &&
      ['active', 'trialing'].includes(subscription.status) &&
      new Date(subscription.current_period_end).getTime() > Date.now()
    );

    // 2. Licence commerciale si Pro ou Propriétaire
    let license = null;
    if (subscription?.plan_id === 'colorvip_pro' || isOwner) {
      const { data: licData } = await supabaseAdmin
        .from(tables.licenses)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (licData) {
        license = licData;
      } else if (isOwner) {
        const start = new Date();
        const end = new Date(start);
        end.setFullYear(start.getFullYear() + 1);

        license = {
          license_number: 'CBL-2026-FL83-MSTR-9901',
          customer_name: 'Florian',
          customer_email: 'flo83119@gmail.com',
          plan_type: 'colorvip_pro',
          interval: 'year',
          valid_from: start.toISOString(),
          valid_until: end.toISOString(),
          status: 'active',
        };
      }
    }

    return new Response(
      JSON.stringify({
        isAuthenticated: true,
        isOwner,
        hasActiveSubscription: hasActiveSub || isOwner,
        canDownloadSvg: hasActiveSub || isOwner,
        subscription: subscription || (isOwner ? {
          plan_id: 'colorvip_pro',
          status: 'active',
          interval: 'year',
          amount: 4999,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString(),
          cancel_at_period_end: false,
        } : null),
        license,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erreur subscription-status:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la récupération du statut d’abonnement.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
