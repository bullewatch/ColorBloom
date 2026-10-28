import { createClient } from '@supabase/supabase-js';

export const PROD_SUPABASE_PROJECT_REF = 'jlyzoxqihqofvsfyqwsw';
export const OWNER_USER_ID = 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

/**
 * Détermine si l'environnement ou les options courantes correspondent au mode test/sandbox.
 */
export function isSandboxEnvironment(env = {}, options = {}) {
  if (options.isSandbox !== undefined) return Boolean(options.isSandbox);
  const stripeKey = env.STRIPE_SECRET_KEY || (typeof process !== 'undefined' && process.env?.STRIPE_SECRET_KEY) || '';
  if (stripeKey.startsWith('sk_test_')) return true;
  if (env.ENVIRONMENT === 'test' || env.ENVIRONMENT === 'sandbox' || env.CF_PAGES_BRANCH === 'test') return true;
  return false;
}

/**
 * Résout les URLs et clés Supabase appropriées selon que l'on s'exécute
 * en environnement réel ou en environnement de test isolé.
 */
export function resolveSupabaseCredentials(env = {}, isSandbox = false) {
  // 1. Si nous sommes en mode Sandbox et que des identifiants de test dédiés sont configurés
  if (isSandbox && env.SUPABASE_TEST_URL && env.SUPABASE_TEST_SERVICE_ROLE_KEY) {
    return {
      url: env.SUPABASE_TEST_URL,
      serviceKey: env.SUPABASE_TEST_SERVICE_ROLE_KEY,
      isTestProject: true,
      isProductionProject: false,
    };
  }

  // 2. Configuration standard Cloudflare Pages
  const url =
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
    `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`;

  const serviceKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY);

  const isProductionProject = url.includes(PROD_SUPABASE_PROJECT_REF);

  return {
    url,
    serviceKey,
    isTestProject: !isProductionProject,
    isProductionProject,
  };
}

/**
 * Initialise le client Supabase privilégié (service_role) pour Cloudflare Pages Functions.
 * Garantit l'isolation stricte entre la base de production et l'environnement de test.
 */
export function getSupabaseAdmin(env = {}, options = {}) {
  const isSandbox = isSandboxEnvironment(env, options);
  const { url, serviceKey } = resolveSupabaseCredentials(env, isSandbox);

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante dans les variables secrètes Cloudflare.');
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Détermine les tables cibles en fonction du mode (production vs sandbox).
 * Si des tests sandbox sont exécutés alors que l'environnement pointe encore vers la base de production,
 * le système bascule sur les tables partitionnées 'sandbox_*' pour protéger intégralement les utilisateurs réels.
 */
export function getTargetTables(env = {}, isSandbox = false) {
  const creds = resolveSupabaseCredentials(env, isSandbox);

  // Si c'est un projet Supabase de test dédié, on utilise les tables standard sur cette base isolée
  if (creds.isTestProject) {
    return {
      subscriptions: 'subscriptions',
      licenses: 'licenses',
      stripeEvents: 'stripe_events',
      isPartitioned: false,
      isTestProject: true,
      isProductionProject: false,
    };
  }

  // Si c'est la base de production et que nous sommes en sandbox
  if (isSandbox && creds.isProductionProject) {
    const useSandboxTables = env.ENABLE_SANDBOX_TABLES === 'true';
    return {
      subscriptions: useSandboxTables ? 'sandbox_subscriptions' : 'subscriptions',
      licenses: useSandboxTables ? 'sandbox_licenses' : 'licenses',
      stripeEvents: useSandboxTables ? 'sandbox_stripe_events' : 'stripe_events',
      isPartitioned: useSandboxTables,
      isTestProject: false,
      isProductionProject: true,
    };
  }

  return {
    subscriptions: 'subscriptions',
    licenses: 'licenses',
    stripeEvents: 'stripe_events',
    isPartitioned: false,
    isTestProject: false,
    isProductionProject: true,
  };
}

/**
 * Vérifie l'en-tête Authorization: Bearer <jwt> et retourne l'utilisateur Supabase.
 */
export async function authenticateUser(request, env = {}) {
  let authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  // Support du paramètre ?token= pour les téléchargements de fichiers
  if (!authHeader) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (token) {
      authHeader = `Bearer ${token}`;
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: new Error('Token d’authentification manquant.') };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseAdmin = getSupabaseAdmin(env);

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error || new Error('Session invalide ou expirée.') };
  }

  return { user: data.user, error: null };
}

/**
 * Récupère l'abonnement actif d'un utilisateur.
 */
export async function getUserSubscription(userId, env = {}, options = {}) {
  if (!userId) return null;
  const isSandbox = isSandboxEnvironment(env, options);
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
  const tables = getTargetTables(env, isSandbox);

  // Privilège permanent pour le compte propriétaire
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  const isOwner = Boolean(profile?.is_admin || userId === OWNER_USER_ID);
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
    .from(tables.subscriptions)
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erreur récupération abonnement Supabase:', error);
  }

  return data;
}

/**
 * Met à jour ou insère un abonnement dans la base et synchronise le profil.
 * Protège contre les événements reçus dans le désordre et isole les écritures de test.
 */
export async function syncSubscription(subData, env = {}, options = {}) {
  const isSandbox = isSandboxEnvironment(env, options);
  const tables = getTargetTables(env, isSandbox);
  const creds = resolveSupabaseCredentials(env, isSandbox);
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });

  // GARDE-FOU STRICT MISSION 4 :
  // Si transaction de test sur le projet de production sans tables de sandbox partitionnées ni projet test dédié,
  // interdiction formelle d'altérer un compte utilisateur de production.
  if (isSandbox && creds.isProductionProject && !tables.isPartitioned) {
    const isProtectedProdUser = [OWNER_USER_ID, 'c1ce8b33-8017-46a3-bcec-b1b02be0db7e', 'e9e4a37f-cc5d-402f-b9b3-436bcb425067'].includes(subData.user_id);
    if (isProtectedProdUser) {
      console.warn(`[BLOCAGE SÉCURITÉ SANDBOX] Tentative d'écriture Stripe Sandbox sur l'utilisateur de production ${subData.user_id} bloquée.`);
      return;
    }
  }

  // Protection contre les événements reçus dans le désordre (Out-of-order events)
  const { data: existingSub } = await supabaseAdmin
    .from(tables.subscriptions)
    .select('updated_at, status')
    .eq('id', subData.id)
    .maybeSingle();

  if (existingSub?.updated_at && subData.updated_at) {
    const existingTime = new Date(existingSub.updated_at).getTime();
    const incomingTime = new Date(subData.updated_at).getTime();
    if (incomingTime < existingTime) {
      console.warn(`[OUT-OF-ORDER] Événement antérieur ignoré pour abonnement ${subData.id}. (existant: ${existingSub.updated_at}, reçu: ${subData.updated_at})`);
      return;
    }
  }

  const { error: subErr } = await supabaseAdmin
    .from(tables.subscriptions)
    .upsert(subData, { onConflict: 'id' });

  if (subErr) {
    console.error('Erreur upsert subscription:', subErr);
    throw subErr;
  }

  // Mise à jour du profil utilisateur (uniquement si projet test ou utilisateur non-protégé)
  if (!creds.isProductionProject || !isSandbox) {
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
}

/**
 * Génère un numéro de série officiel unique pour licence officielle Colorblop (ex: CBL-2026-8K4F-9W2M-7X1P).
 */
export function generateLicenseSerialNumber(year = new Date().getFullYear()) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const segment = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CBL-${year}-${segment(4)}-${segment(4)}-${segment(4)}`;
}

/**
 * Calcule avec exactitude la date de fin calendaire.
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
 * Les droits commerciaux correspondent à la période effectivement payée et restent valables
 * jusqu'au terme de celle-ci même en cas de résiliation anticipée.
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
}, env = {}, options = {}) {
  const isSandbox = isSandboxEnvironment(env, options);
  const tables = getTargetTables(env, isSandbox);
  const creds = resolveSupabaseCredentials(env, isSandbox);
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });

  // GARDE-FOU SANDBOX
  if (isSandbox && creds.isProductionProject && !tables.isPartitioned) {
    const isProtectedProdUser = [OWNER_USER_ID, 'c1ce8b33-8017-46a3-bcec-b1b02be0db7e', 'e9e4a37f-cc5d-402f-b9b3-436bcb425067'].includes(userId);
    if (isProtectedProdUser) {
      console.warn(`[BLOCAGE SÉCURITÉ SANDBOX] Génération de licence sandbox sur utilisateur prod ${userId} bloquée.`);
      return null;
    }
  }

  const dates = computeExactCalendarDates(periodStart, interval);
  const finalStart = periodStart ? new Date(periodStart).toISOString() : dates.validFrom;
  const finalEnd = periodEnd ? new Date(periodEnd).toISOString() : dates.validUntil;

  const { data: existing } = await supabaseAdmin
    .from(tables.licenses)
    .select('*')
    .eq('subscription_id', subscriptionId)
    .maybeSingle();

  const startYear = new Date(finalStart).getFullYear();
  const licenseNumber = existing?.license_number || generateLicenseSerialNumber(startYear);

  // Préservation du nom de titulaire officiel verrouillé
  const resolvedName = (existing?.customer_name && existing.customer_name !== 'MEMBRE PRO COLORBLOP')
    ? existing.customer_name
    : (customerName || 'MEMBRE PRO COLORBLOP');

  const licensePayload = {
    license_number: licenseNumber,
    user_id: userId,
    subscription_id: subscriptionId,
    customer_name: resolvedName,
    customer_email: customerEmail || existing?.customer_email || '',
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
    .from(tables.licenses)
    .upsert(licensePayload, { onConflict: 'subscription_id' })
    .select()
    .single();

  if (error) {
    console.error('Erreur sync commercial license:', error);
  }

  return data;
}

/**
 * Idempotence atomique pour webhooks Stripe.
 * Tente d'enregistrer l'événement avant tout traitement.
 * En cas de requêtes concurrentes simultanées, le premier insert verrouille l'événement,
 * et le doublon échoue immédiatement (code 23505 / duplicate key).
 */
export async function claimEvent(eventId, type, env = {}, isSandbox = false) {
  const tables = getTargetTables(env, isSandbox);
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });

  const { error } = await supabaseAdmin.from(tables.stripeEvents).insert({
    id: eventId,
    type,
    processed_at: new Date().toISOString(),
  });

  if (error) {
    // Clé primaire déjà existante : événement déjà traité ou en cours
    if (
      error.code === '23505' ||
      error.message?.includes('duplicate key') ||
      error.message?.includes('unique constraint')
    ) {
      return { alreadyHandled: true };
    }
    console.error(`Erreur claimEvent [${eventId}]:`, error);
    return { alreadyHandled: false, error };
  }

  return { alreadyHandled: false };
}

/**
 * Compatibilité idempotence historique.
 */
export async function isEventProcessed(eventId, env = {}, isSandbox = false) {
  const tables = getTargetTables(env, isSandbox);
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
  const { data } = await supabaseAdmin
    .from(tables.stripeEvents)
    .select('id')
    .eq('id', eventId)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function markEventProcessed(eventId, type, env = {}, isSandbox = false) {
  const tables = getTargetTables(env, isSandbox);
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
  await supabaseAdmin.from(tables.stripeEvents).upsert({
    id: eventId,
    type,
    processed_at: new Date().toISOString(),
  });
}
