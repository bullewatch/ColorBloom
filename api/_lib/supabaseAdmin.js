import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://jlyzoxqihqofvsfyqwsw.supabase.co';

// On utilise en priorité la clé secrète service_role côté serveur, avec fallback sur anon
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpseXpveHFpaHFvZnZzZnlxd3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDIzNjEsImV4cCI6MjEwNjA3ODM2MX0.BA-pqJyN4oc8hJ9QhZK2KKe0m-I_oJSSfBDcqA62C4A';

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Vérifie l'en-tête Authorization: Bearer <jwt> et retourne l'utilisateur Supabase.
 */
export async function authenticateUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: new Error('Token d’authentification manquant.') };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error || new Error('Session invalide ou expirée.') };
  }

  return { user: data.user, error: null };
}

/**
 * Récupère l'abonnement actif d'un utilisateur.
 */
export async function getUserSubscription(userId) {
  if (!userId) return null;

  // L'administrateur propriétaire flo83119@gmail.com a toujours un accès VIP Pro permanent
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const isOwner = Boolean(profile?.is_admin || userId === 'efd85ff7-77c2-4508-9493-156c58bbc9fa');
  if (isOwner) {
    return {
      id: 'sub_owner_master',
      user_id: userId,
      plan_id: 'colorvip_pro',
      status: 'active',
      interval: 'year',
      amount: 4999,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString(),
      cancel_at_period_end: false,
    };
  }

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erreur récupération abonnement:', error);
  }

  return data;
}

/**
 * Met à jour ou insère un abonnement dans la base et synchronise le profil.
 */
export async function syncSubscription(subData) {
  const { error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .upsert(subData, { onConflict: 'id' });

  if (subErr) {
    console.error('Erreur upsert subscription:', subErr);
    throw subErr;
  }

  // Mettre à jour le statut dans profiles
  const isActive = ['active', 'trialing'].includes(subData.status);
  await supabaseAdmin
    .from('profiles')
    .update({
      stripe_customer_id: subData.stripe_customer_id,
      subscription_plan: isActive ? subData.plan_id : null,
      subscription_status: subData.status,
      subscription_period_end: subData.current_period_end,
    })
    .eq('id', subData.user_id);
}

/**
 * Génère un véritable numéro de série unique pour licence officielle Colorblop (ex: CBL-2026-8K4F-9W2M-7X1P).
 */
export function generateLicenseSerialNumber(year = new Date().getFullYear()) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const segment = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CBL-${year}-${segment(4)}-${segment(4)}-${segment(4)}`;
}

/**
 * Calcule avec exactitude la date de fin calendaire :
 * Début = jour de l'abonnement
 * Fin = exactement le même jour calendaire 1 an plus tard (annuel) ou 1 mois plus tard (mensuel).
 */
export function computeExactCalendarDates(periodStartInput, interval = 'month') {
  const startDate = periodStartInput ? new Date(periodStartInput) : new Date();
  const endDate = new Date(startDate);
  if (interval === 'year') {
    endDate.setFullYear(startDate.getFullYear() + 1);
  } else {
    endDate.setMonth(startDate.getMonth() + 1);
  }
  return {
    validFrom: startDate.toISOString(),
    validUntil: endDate.toISOString(),
  };
}

/**
 * Génère ou prolonge une licence commerciale nominative pour ColorVIP Pro.
 */
export async function syncCommercialLicense({
  userId,
  subscriptionId,
  customerName,
  customerEmail,
  interval = 'month',
  periodStart,
  periodEnd,
  status = 'active',
}) {
  // Calcul exact des dates au même jour calendaire
  const dates = computeExactCalendarDates(periodStart, interval);
  const finalStart = dates.validFrom;
  const finalEnd = periodEnd || dates.validUntil;

  // Vérifier si une licence existe déjà pour cette souscription
  const { data: existing } = await supabaseAdmin
    .from('licenses')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .maybeSingle();

  const startYear = new Date(finalStart).getFullYear();
  const licenseNumber = existing?.license_number || generateLicenseSerialNumber(startYear);

  const licensePayload = {
    license_number: licenseNumber,
    user_id: userId,
    subscription_id: subscriptionId,
    customer_name: customerName,
    customer_email: customerEmail,
    plan_type: 'colorvip_pro',
    interval,
    valid_from: finalStart,
    valid_until: finalEnd,
    status,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    licensePayload.id = existing.id;
  }

  const { data, error } = await supabaseAdmin
    .from('licenses')
    .upsert(licensePayload, { onConflict: 'subscription_id' })
    .select()
    .single();

  if (error) {
    console.error('Erreur sync commercial license:', error);
  }

  return data;
}

/**
 * Idempotence pour webhooks Stripe.
 */
export async function isEventProcessed(eventId) {
  const { data } = await supabaseAdmin
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function markEventProcessed(eventId, type) {
  await supabaseAdmin.from('stripe_events').insert({
    id: eventId,
    type,
    processed_at: new Date().toISOString(),
  });
}
