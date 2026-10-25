import { authenticateUser, supabaseAdmin, getUserSubscription } from './_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez GET.' });
  }

  try {
    const { user, error: authErr } = await authenticateUser(req);
    if (authErr || !user) {
      return res.status(200).json({
        isAuthenticated: false,
        hasActiveSubscription: false,
        canDownloadSvg: false,
        subscription: null,
        license: null,
      });
    }

    const isOwner = user.email?.toLowerCase() === 'flo83119@gmail.com' || user.id === 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

    // 1. Récupérer l'abonnement en base
    const subscription = await getUserSubscription(user.id);
    const hasActiveSub = Boolean(
      subscription &&
      ['active', 'trialing'].includes(subscription.status) &&
      new Date(subscription.current_period_end).getTime() > Date.now()
    );

    // 2. Si Pro, récupérer la licence commerciale
    let license = null;
    if (subscription?.plan_id === 'colorvip_pro' || isOwner) {
      const { data: licData } = await supabaseAdmin
        .from('licenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (licData) {
        license = licData;
      } else if (isOwner) {
        // Licence créateur/artiste pour le propriétaire
        license = {
          license_number: 'CBL-PRO-OWNER-MASTER',
          customer_name: 'Florian (Artiste & Propriétaire Colorblop)',
          customer_email: 'flo83119@gmail.com',
          plan_type: 'colorvip_pro',
          interval: 'year',
          valid_from: new Date().toISOString(),
          valid_until: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString(),
          status: 'active',
        };
      }
    }

    return res.status(200).json({
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
    });
  } catch (err) {
    console.error('Erreur subscription-status:', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération du statut.' });
  }
}
