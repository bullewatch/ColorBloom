import Stripe from 'stripe';

export const PLANS = {
  COLORVIP: 'colorvip',
  COLORVIP_PRO: 'colorvip_pro',
};

export const INTERVALS = {
  MONTH: 'month',
  YEAR: 'year',
};

export const STRIPE_API_VERSION = '2026-09-30.endive';

export const STRIPE_TAX_CODE = 'txcd_10505002';

export const PLAN_CONFIG = {
  [PLANS.COLORVIP]: {
    name: 'ColorVIP',
    tax_code: STRIPE_TAX_CODE,
    description: 'Accès illimité aux téléchargements vectoriels SVG (Usage personnel)',
    features: [
      'Téléchargements SVG vectoriels illimités',
      'Usage personnel uniquement',
      'Accès à l’ensemble du catalogue',
      'Téléchargements PNG & PDF haute résolution inclus',
    ],
    prices: {
      [INTERVALS.MONTH]: {
        amount: 299,
        currency: 'eur',
        label: '2,99 € / mois',
      },
      [INTERVALS.YEAR]: {
        amount: 2499,
        currency: 'eur',
        label: '24,99 € / an',
        crossedAmount: '35,88 €',
        discountBadge: 'Économisez 30 %',
        note: 'Soit environ 2,08 €/mois',
      },
    },
  },
  [PLANS.COLORVIP_PRO]: {
    name: 'ColorVIP Pro',
    tax_code: STRIPE_TAX_CODE,
    description: 'Accès illimité aux téléchargements vectoriels SVG (Usage personnel & Licence commerciale incluse)',
    features: [
      'Téléchargements SVG vectoriels illimités',
      'Usage personnel et commercial autorisé',
      'Vente de produits physiques autorisée (selon conditions)',
      'Attestation de licence commerciale nominative (PDF téléchargeable)',
      'Numéro de licence officiel unique avec période de validité',
      'Téléchargements PNG & PDF haute résolution inclus',
    ],
    prices: {
      [INTERVALS.MONTH]: {
        amount: 599,
        currency: 'eur',
        label: '5,99 € / mois',
      },
      [INTERVALS.YEAR]: {
        amount: 4999,
        currency: 'eur',
        label: '49,99 € / an',
        crossedAmount: '71,88 €',
        discountBadge: 'Économisez 30 %',
        note: 'Soit environ 4,16 €/mois',
      },
    },
  },
};

/**
 * Détermine si une clé secrète Stripe correspond au mode sandbox de test.
 */
export function isStripeSandboxKey(secretKey = '') {
  return typeof secretKey === 'string' && secretKey.trim().startsWith('sk_test_');
}

/**
 * Initialise le client Stripe configuré pour le runtime Cloudflare Pages (fetch HTTP client)
 * avec la version API stable '2026-09-30.endive'.
 */
export function getStripe(env = {}) {
  if (env.stripeClient) {
    return env.stripeClient;
  }
  const secretKey =
    env.STRIPE_SECRET_KEY ||
    (typeof process !== 'undefined' && process.env?.STRIPE_SECRET_KEY);

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY manquante dans les variables d’environnement Cloudflare.');
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
    appInfo: {
      name: 'Colorblop',
      version: '1.0.0',
    },
  });
}

/**
 * Extrait les dates exactes de début et fin de période d'un abonnement Stripe.
 *
 * NOTE API Stripe '2026-09-30.endive' :
 * Les propriétés 'current_period_start' et 'current_period_end' ne sont plus sur la racine
 * de l'objet Subscription, mais sur chaque élément d'abonnement ('items.data[0]').
 * Cette fonction lit prioritairement la structure 2026-09-30.endive tout en conservant
 * des fallbacks résilients pour éviter tout RangeError / Invalid time value.
 */
export function getSubscriptionDates(sub) {
  if (!sub) {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return {
      periodStart: now.toISOString(),
      periodEnd: nextMonth.toISOString(),
      rawStartSec: Math.floor(now.getTime() / 1000),
      rawEndSec: Math.floor(nextMonth.getTime() / 1000),
    };
  }

  const firstItem = sub.items?.data?.[0];

  // 1. Début de période : priorité item (2026-09-30.endive), puis root legacy, puis start_date / created
  const rawStartSec =
    firstItem?.current_period_start ??
    sub.current_period_start ??
    sub.start_date ??
    sub.created;

  // 2. Fin de période : priorité item (2026-09-30.endive), puis root legacy, puis cancel_at / ended_at
  const rawEndSec =
    firstItem?.current_period_end ??
    sub.current_period_end ??
    sub.cancel_at ??
    sub.ended_at;

  const startDate = rawStartSec
    ? new Date(rawStartSec * 1000)
    : new Date();

  let endDate;
  if (rawEndSec) {
    endDate = new Date(rawEndSec * 1000);
  } else {
    // Calcul par défaut basé sur l'intervalle si non disponible
    const interval = firstItem?.price?.recurring?.interval || 'month';
    endDate = new Date(startDate);
    if (interval === 'year') {
      endDate.setFullYear(startDate.getFullYear() + 1);
    } else {
      endDate.setMonth(startDate.getMonth() + 1);
    }
  }

  // Sécurité absolue contre Invalid Date
  const validStart = isNaN(startDate.getTime()) ? new Date() : startDate;
  const validEnd = isNaN(endDate.getTime())
    ? new Date(validStart.getTime() + 30 * 24 * 3600 * 1000)
    : endDate;

  return {
    periodStart: validStart.toISOString(),
    periodEnd: validEnd.toISOString(),
    rawStartSec: Math.floor(validStart.getTime() / 1000),
    rawEndSec: Math.floor(validEnd.getTime() / 1000),
  };
}

/**
 * Extrait l'identifiant d'abonnement depuis un objet Facture Stripe (Invoice).
 *
 * NOTE API Stripe '2026-09-30.endive' :
 * La propriété racine 'invoice.subscription' est désormais migrée vers :
 * 'invoice.parent.subscription_details.subscription' (ou lignes de facture).
 */
export function getInvoiceSubscriptionId(invoice) {
  if (!invoice) return null;

  // 1. Structure Stripe 2026-09-30.endive : invoice.parent.subscription_details.subscription
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (parentSub) {
    return typeof parentSub === 'string' ? parentSub : parentSub.id;
  }

  // 2. Lignes de facture (InvoiceLineItem parent subscription_item_details)
  const lineSub = invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription;
  if (lineSub) {
    return typeof lineSub === 'string' ? lineSub : lineSub.id;
  }

  // 3. Fallback format hérité pour compatibilité
  if (invoice.subscription) {
    return typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
  }

  return null;
}

/**
 * Extrait et qualifie la formule, l'intervalle et le montant depuis un abonnement Stripe.
 */
export function getSubscriptionPlanInfo(sub) {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  const unitAmount = price?.unit_amount || 0;
  const interval = price?.recurring?.interval || 'month';

  let planId = sub.metadata?.plan_id || price?.metadata?.plan_id;
  if (!planId) {
    if (unitAmount >= 4999 || unitAmount === 599) {
      planId = PLANS.COLORVIP_PRO;
    } else {
      planId = PLANS.COLORVIP;
    }
  }

  return {
    item,
    price,
    priceId: price?.id || '',
    unitAmount,
    interval,
    planId,
    currency: price?.currency || 'eur',
  };
}

/**
 * Assure que les fiches produits et tarifs existent dans Stripe sans doublon.
 * Ajoute et synchronise le code fiscal Stripe (txcd_10505002) requis pour Managed Payments.
 */
export async function ensureStripeProductsAndPrices(stripe) {
  const existingProducts = await stripe.products.list({ limit: 100, active: true });

  let prodVip = existingProducts.data.find(
    p => p.metadata?.plan_id === PLANS.COLORVIP || p.name === 'ColorVIP'
  );
  let prodPro = existingProducts.data.find(
    p => p.metadata?.plan_id === PLANS.COLORVIP_PRO || p.name === 'ColorVIP Pro'
  );

  if (!prodVip) {
    prodVip = await stripe.products.create({
      name: 'ColorVIP',
      description: PLAN_CONFIG[PLANS.COLORVIP].description,
      tax_code: STRIPE_TAX_CODE,
      metadata: {
        app: 'colorblop',
        plan_id: PLANS.COLORVIP,
        commercial_license: 'false',
      },
    });
  } else if (!prodVip.tax_code) {
    prodVip = await stripe.products.update(prodVip.id, {
      tax_code: STRIPE_TAX_CODE,
    });
  }

  if (!prodPro) {
    prodPro = await stripe.products.create({
      name: 'ColorVIP Pro',
      description: PLAN_CONFIG[PLANS.COLORVIP_PRO].description,
      tax_code: STRIPE_TAX_CODE,
      metadata: {
        app: 'colorblop',
        plan_id: PLANS.COLORVIP_PRO,
        commercial_license: 'true',
      },
    });
  } else if (!prodPro.tax_code) {
    prodPro = await stripe.products.update(prodPro.id, {
      tax_code: STRIPE_TAX_CODE,
    });
  }

  const existingPrices = await stripe.prices.list({ limit: 100, active: true });

  async function findOrCreatePrice(product, amount, interval, planId) {
    const found = existingPrices.data.find(
      p =>
        p.product === product.id &&
        p.unit_amount === amount &&
        p.currency === 'eur' &&
        p.recurring?.interval === interval
    );
    if (found) return found.id;

    const created = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'eur',
      recurring: { interval },
      metadata: {
        app: 'colorblop',
        plan_id: planId,
        interval,
      },
    });
    return created.id;
  }

  const priceVipMonth = await findOrCreatePrice(
    prodVip,
    PLAN_CONFIG[PLANS.COLORVIP].prices[INTERVALS.MONTH].amount,
    'month',
    PLANS.COLORVIP
  );

  const priceVipYear = await findOrCreatePrice(
    prodVip,
    PLAN_CONFIG[PLANS.COLORVIP].prices[INTERVALS.YEAR].amount,
    'year',
    PLANS.COLORVIP
  );

  const priceProMonth = await findOrCreatePrice(
    prodPro,
    PLAN_CONFIG[PLANS.COLORVIP_PRO].prices[INTERVALS.MONTH].amount,
    'month',
    PLANS.COLORVIP_PRO
  );

  const priceProYear = await findOrCreatePrice(
    prodPro,
    PLAN_CONFIG[PLANS.COLORVIP_PRO].prices[INTERVALS.YEAR].amount,
    'year',
    PLANS.COLORVIP_PRO
  );

  return {
    products: {
      [PLANS.COLORVIP]: prodVip.id,
      [PLANS.COLORVIP_PRO]: prodPro.id,
    },
    prices: {
      [`${PLANS.COLORVIP}_${INTERVALS.MONTH}`]: priceVipMonth,
      [`${PLANS.COLORVIP}_${INTERVALS.YEAR}`]: priceVipYear,
      [`${PLANS.COLORVIP_PRO}_${INTERVALS.MONTH}`]: priceProMonth,
      [`${PLANS.COLORVIP_PRO}_${INTERVALS.YEAR}`]: priceProYear,
    },
  };
}
