import { createClient } from '@supabase/supabase-js';

export const PROD_SUPABASE_PROJECT_REF = 'jlyzoxqihqofvsfyqwsw';
export const OWNER_USER_ID = 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

/**
 * Erreur levée lorsqu'une opération Sandbox tente d'altérer la base de production
 * sans environnement de test isolé.
 */
export class SandboxIsolationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SandboxIsolationError';
    this.code = 'SANDBOX_ISOLATION_VIOLATION';
  }
}

/**
 * Détermine si la requête s'exécute en mode Sandbox/Test :
 * - Détection prioritaire par clé secrète Stripe (sk_test_*)
 * - Détection par variable d'environnement (ENVIRONMENT=test|sandbox)
 * - Indépendant du statut de déploiement Cloudflare Pages (fonctionne même si la branche
 *   est configurée comme branche de "Production" dans Cloudflare).
 */
export function isSandboxEnvironment(env = {}, options = {}) {
  if (options.isSandbox !== undefined) return Boolean(options.isSandbox);
  const stripeKey =
    env.STRIPE_SECRET_KEY ||
    (typeof process !== 'undefined' && process.env?.STRIPE_SECRET_KEY) ||
    '';
  if (typeof stripeKey === 'string' && stripeKey.trim().startsWith('sk_test_')) {
    return true;
  }
  if (env.ENVIRONMENT === 'test' || env.ENVIRONMENT === 'sandbox') {
    return true;
  }
  return false;
}

/**
 * Résout les identifiants Supabase en privilégiant une base de test séparée :
 * 1. SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY si configurés
 * 2. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY globaux
 */
export function resolveSupabaseCredentials(env = {}, isSandbox = false) {
  // Priorité 1 : Base de test dédiée configurée via variables dédiées
  if (isSandbox && env.SUPABASE_TEST_URL && env.SUPABASE_TEST_SERVICE_ROLE_KEY) {
    return {
      url: env.SUPABASE_TEST_URL,
      serviceKey: env.SUPABASE_TEST_SERVICE_ROLE_KEY,
      isTestProject: true,
      isProductionProject: false,
    };
  }

  // Priorité 2 : Variables Supabase standard de l'environnement Cloudflare Pages
  const url =
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
    `https://${PROD_SUPABASE_PROJECT_REF}.supabase.co`;

  const serviceKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY);

  const isProductionProject = Boolean(url && url.includes(PROD_SUPABASE_PROJECT_REF));

  return {
    url,
    serviceKey,
    isTestProject: !isProductionProject,
    isProductionProject,
  };
}

/**
 * Initialise le client Supabase privilégié (service_role) pour Cloudflare Pages Functions.
 */
export function getSupabaseAdmin(env = {}, options = {}) {
  if (options.supabaseClient) {
    return options.supabaseClient;
  }
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
 * Détermine les tables cibles en appliquant un principe STRICT de Fail-Closed :
 * - Si environnement réel (sk_live), retourne les tables de production.
 * - Si sandbox avec base de test dédiée (SUPABASE_TEST_URL ou URL non-prod), retourne les tables standard de cette base isolée.
 * - Si sandbox pointant sur la base de production (jlyzoxqihqofvsfyqwsw) :
 *   - Si ENABLE_SANDBOX_TABLES === 'true', retourne les tables isolées 'sandbox_*'.
 *   - Si ENABLE_SANDBOX_TABLES n'est PAS activé, REFUSE d'autoriser toute écriture (canWrite: false, tables à null).
 *   - Ne retourne JAMAIS les tables de production en sandbox sur la base réelle.
 */
export function getTargetTables(env = {}, isSandbox = false) {
  const creds = resolveSupabaseCredentials(env, isSandbox);

  // Cas A : Projet de test Supabase complètement séparé (recommandé pour bout-en-bout)
  if (creds.isTestProject) {
    return {
      subscriptions: 'subscriptions',
      licenses: 'licenses',
      stripeEvents: 'stripe_events',
      isPartitioned: false,
      isTestProject: true,
      isProductionProject: false,
      canWrite: true,
    };
  }

  // Cas B : Sandbox exécutée face à la base de production (jlyzoxqihqofvsfyqwsw)
  if (isSandbox && creds.isProductionProject) {
    const useSandboxTables = env.ENABLE_SANDBOX_TABLES === 'true';
    if (useSandboxTables) {
      return {
        subscriptions: 'sandbox_subscriptions',
        licenses: 'sandbox_licenses',
        stripeEvents: 'sandbox_stripe_events',
        isPartitioned: true,
        isTestProject: false,
        isProductionProject: true,
        canWrite: true,
      };
    }

    // FAIL-CLOSED STRICT : Ni base de test séparée, ni tables sandbox activées.
    // Interdiction formelle de retourner ou d'écrire dans les tables de production.
    return {
      subscriptions: null,
      licenses: null,
      stripeEvents: null,
      isPartitioned: false,
      isTestProject: false,
      isProductionProject: true,
      canWrite: false,
      error: new SandboxIsolationError(
        `[FAIL-CLOSED CRITIQUE] Tentative d'accès Sandbox Stripe sur la base Supabase de Production (${PROD_SUPABASE_PROJECT_REF}). ` +
        `Pour protéger l'intégralité des données et profils réels, vous devez soit connecter un projet Supabase de test dédié (SUPABASE_TEST_URL), ` +
        `soit activer explicitement ENABLE_SANDBOX_TABLES='true'.`
      ),
    };
  }

  // Cas C : Production normale (sk_live) sur la base de production
  return {
    subscriptions: 'subscriptions',
    licenses: 'licenses',
    stripeEvents: 'stripe_events',
    isPartitioned: false,
    isTestProject: false,
    isProductionProject: true,
    canWrite: true,
  };
}

/**
 * Vérifie l'en-tête Authorization: Bearer <jwt> et retourne l'utilisateur Supabase.
 */
export async function authenticateUser(request, env = {}) {
  let authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

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
  const creds = resolveSupabaseCredentials(env, isSandbox);
  const tables = getTargetTables(env, isSandbox);
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });

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

  // Si sandbox sans droit d'accès
  if (!tables.canWrite && !tables.subscriptions) {
    return null;
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
 * FAIL-CLOSED : Bloque toute écriture sur les tables ou profils de production en Sandbox.
 */
export async function syncSubscription(subData, env = {}, options = {}) {
  const isSandbox = isSandboxEnvironment(env, options);
  const tables = getTargetTables(env, isSandbox);
  const creds = resolveSupabaseCredentials(env, isSandbox);

  // 1. CONTRÔLE FAIL-CLOSED STRICT SUR LES TABLES D'ABONNEMENT
  if (!tables.canWrite || !tables.subscriptions) {
    console.error(`[FAIL-CLOSED] ${tables.error?.message || "Écriture d'abonnement refusée en mode Sandbox."}`);
    throw (tables.error || new SandboxIsolationError("Écriture d'abonnement refusée : environnement non autorisé."));
  }

  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });

  // 2. Protection contre les événements reçus dans le désordre (Out-of-order events)
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

  // 3. CONTRÔLE FAIL-CLOSED STRICT SUR LES PROFILS UTILISATEURS
  // Si connexion sur la base de production et mode Sandbox, AUCUN profil de production ne peut être altéré.
  if (creds.isProductionProject && isSandbox) {
    console.warn(`[FAIL-CLOSED PROFILES] Aucune altération du profil de production pour l'utilisateur ${subData.user_id} en mode Sandbox.`);
    return;
  }

  // Mise à jour normale du profil (uniquement sur base de test dédiée, ou en production sk_live)
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
 * FAIL-CLOSED : Aucune écriture de licence sur la production en mode Sandbox.
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

  if (!tables.canWrite || !tables.licenses) {
    console.error(`[FAIL-CLOSED] ${tables.error?.message || "Écriture de licence refusée en mode Sandbox."}`);
    throw (tables.error || new SandboxIsolationError("Écriture de licence refusée : environnement non autorisé."));
  }

  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
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
    throw error;
  }

  return data;
}

export const EVENT_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const LOCK_TIMEOUT_MS = 60 * 1000; // 60 secondes pour éviter les traitements simultanés

/**
 * Idempotence avec gestion d'état et verrou de traitement pour webhooks Stripe.
 * Différencie :
 * - 'processing' : traitement en cours (évite les exécutions simultanées)
 * - 'completed'  : traitement réussi (bloque les doublons réels)
 * - 'failed'     : traitement ayant échoué (autorise les retries Stripe sans réinitialisation manuelle)
 *
 * FAIL-CLOSED : Si l'écriture échoue ou est bloquée par l'isolation Sandbox,
 * retourne une erreur explicite qui stoppe immédiatement le webhook.
 */
export async function claimEvent(eventId, type, env = {}, isSandbox = false, options = {}) {
  const tables = getTargetTables(env, isSandbox);

  if (!tables.canWrite || !tables.stripeEvents) {
    return {
      alreadyHandled: false,
      error: tables.error || new SandboxIsolationError(
        `[FAIL-CLOSED] Enregistrement d'événement Stripe refusé sur la base de production en mode Sandbox.`
      ),
    };
  }

  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox, ...options });

  // 1. Vérifier si l'événement a déjà été enregistré
  const { data: existing, error: selectErr } = await supabaseAdmin
    .from(tables.stripeEvents)
    .select('id, status, claimed_at, processed_at')
    .eq('id', eventId)
    .maybeSingle();

  if (selectErr && !selectErr.message?.includes('column "status"')) {
    console.error(`Erreur select claimEvent [${eventId}]:`, selectErr);
    return { alreadyHandled: false, error: selectErr };
  }

  // 2. Gestion des états si l'événement existe déjà
  if (existing) {
    // CAS A : Déjà traité avec succès
    if (existing.status === EVENT_STATUS.COMPLETED) {
      return { alreadyHandled: true, state: 'completed', error: null };
    }

    // CAS B : Traitement en cours (concurrence simultanée)
    if (existing.status === EVENT_STATUS.PROCESSING) {
      const lockTime = new Date(existing.claimed_at || existing.processed_at || 0).getTime();
      const lockAge = Date.now() - lockTime;

      // Si le verrou est récent (< 60 secondes), une autre requête traite activement l'événement
      if (lockAge < LOCK_TIMEOUT_MS) {
        return {
          alreadyHandled: true,
          inFlight: true,
          state: 'processing',
          error: null,
        };
      }

      // Si le verrou a expiré (> 60s), l'exécution précédente s'est interrompue/crashée : on réclame le verrou
      const nowIso = new Date().toISOString();
      const { error: reclaimErr } = await supabaseAdmin
        .from(tables.stripeEvents)
        .update({
          status: EVENT_STATUS.PROCESSING,
          claimed_at: nowIso,
        })
        .eq('id', eventId);

      if (reclaimErr) return { alreadyHandled: false, error: reclaimErr };
      return { alreadyHandled: false, state: 'reclaimed_timeout', error: null };
    }

    // CAS C : Échec lors de la tentative précédente -> Stripe réessaie !
    if (existing.status === EVENT_STATUS.FAILED) {
      const nowIso = new Date().toISOString();
      const { error: retryErr } = await supabaseAdmin
        .from(tables.stripeEvents)
        .update({
          status: EVENT_STATUS.PROCESSING,
          claimed_at: nowIso,
          error_message: null,
        })
        .eq('id', eventId);

      if (retryErr) return { alreadyHandled: false, error: retryErr };
      return { alreadyHandled: false, state: 'reclaimed_failed', error: null };
    }

    // Cas de compatibilité hérité (status null / schéma ancien)
    return { alreadyHandled: true, state: 'legacy_completed', error: null };
  }

  // 3. Nouvel événement : création avec status 'processing'
  const nowIso = new Date().toISOString();
  const { error: insertErr } = await supabaseAdmin
    .from(tables.stripeEvents)
    .insert({
      id: eventId,
      type,
      status: EVENT_STATUS.PROCESSING,
      claimed_at: nowIso,
      processed_at: null,
    });

  if (insertErr) {
    // Rétrocompatibilité : si les colonnes 'status'/'claimed_at' ne sont pas encore créées
    if (insertErr.message?.includes('column "status"') || insertErr.message?.includes('column "claimed_at"')) {
      const { error: fallbackErr } = await supabaseAdmin
        .from(tables.stripeEvents)
        .insert({ id: eventId, type, processed_at: nowIso });

      if (fallbackErr) {
        if (fallbackErr.code === '23505' || fallbackErr.message?.includes('duplicate key')) {
          return { alreadyHandled: true, state: 'legacy_duplicate', error: null };
        }
        return { alreadyHandled: false, error: fallbackErr };
      }
      return { alreadyHandled: false, state: 'claimed_legacy', error: null };
    }

    // Doublon sur requête concurrente simultanée
    if (
      insertErr.code === '23505' ||
      insertErr.message?.includes('duplicate key') ||
      insertErr.message?.includes('unique constraint')
    ) {
      return { alreadyHandled: true, state: 'concurrent_duplicate', error: null };
    }

    console.error(`Erreur insert claimEvent [${eventId}]:`, insertErr);
    return { alreadyHandled: false, error: insertErr };
  }

  return { alreadyHandled: false, state: 'claimed', error: null };
}

/**
 * Marque l'événement comme COMPLETED après succès du traitement complet.
 */
export async function markEventCompleted(eventId, env = {}, isSandbox = false, options = {}) {
  const tables = getTargetTables(env, isSandbox);
  if (!tables.canWrite || !tables.stripeEvents) return;
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox, ...options });
  const nowIso = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from(tables.stripeEvents)
    .update({
      status: EVENT_STATUS.COMPLETED,
      processed_at: nowIso,
      error_message: null,
    })
    .eq('id', eventId);

  if (error && error.message?.includes('column "status"')) {
    await supabaseAdmin
      .from(tables.stripeEvents)
      .update({ processed_at: nowIso })
      .eq('id', eventId);
  }
}

/**
 * Marque l'événement comme FAILED en cas d'erreur de traitement,
 * permettant à Stripe de retenter l'événement ultérieurement sans le considérer comme un doublon.
 */
export async function markEventFailed(eventId, errorMessage = '', env = {}, isSandbox = false, options = {}) {
  const tables = getTargetTables(env, isSandbox);
  if (!tables.canWrite || !tables.stripeEvents) return;
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox, ...options });
  const nowIso = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from(tables.stripeEvents)
    .update({
      status: EVENT_STATUS.FAILED,
      processed_at: nowIso,
      error_message: String(errorMessage || 'Erreur inconnue'),
    })
    .eq('id', eventId);

  if (error && error.message?.includes('column "status"')) {
    // Si pas de colonne status, on supprime la ligne pour que le retry Stripe ne soit pas bloqué par clé dupliquée
    await supabaseAdmin
      .from(tables.stripeEvents)
      .delete()
      .eq('id', eventId);
  }
}

/**
 * Compatibilité idempotence historique.
 */
export async function isEventProcessed(eventId, env = {}, isSandbox = false) {
  const tables = getTargetTables(env, isSandbox);
  if (!tables.canWrite || !tables.stripeEvents) return false;
  const supabaseAdmin = getSupabaseAdmin(env, { isSandbox });
  const { data } = await supabaseAdmin
    .from(tables.stripeEvents)
    .select('id, status')
    .eq('id', eventId)
    .maybeSingle();

  if (!data) return false;
  return data.status === EVENT_STATUS.COMPLETED || !data.status;
}

export async function markEventProcessed(eventId, type, env = {}, isSandbox = false) {
  await markEventCompleted(eventId, env, isSandbox);
}
