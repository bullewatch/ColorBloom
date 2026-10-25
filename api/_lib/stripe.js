import Stripe from 'stripe';

export const PLANS = {
  COLORVIP: 'colorvip',
  COLORVIP_PRO: 'colorvip_pro',
};

export const INTERVALS = {
  MONTH: 'month',
  YEAR: 'year',
};

// Plan definitions with pricing in EUR cents
export const PLAN_CONFIG = {
  [PLANS.COLORVIP]: {
    name: 'ColorVIP',
    description: 'Accès illimité aux téléchargements vectoriels SVG (Usage personnel)',
    features: [
      'Téléchargements SVG vectoriels illimités',
      'Usage personnel uniquement',
      'Accès à l’ensemble du catalogue',
      'Téléchargements PNG & PDF haute résolution inclus',
    ],
    prices: {
      [INTERVALS.MONTH]: {
        amount: 299, // 2,99 €
        currency: 'eur',
        label: '2,99 € / mois',
      },
      [INTERVALS.YEAR]: {
        amount: 2499, // 24,99 €
        currency: 'eur',
        label: '24,99 € / an',
        crossedAmount: '35,88 €',
        discountBadge: 'Économisez 30 %',
        note: 'Soit environ 2,08 €/mois (prix barré calculé sur 12 mensualités à 2,99 €)',
      },
    },
  },
  [PLANS.COLORVIP_PRO]: {
    name: 'ColorVIP Pro',
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
        amount: 599, // 5,99 €
        currency: 'eur',
        label: '5,99 € / mois',
      },
      [INTERVALS.YEAR]: {
        amount: 4999, // 49,99 €
        currency: 'eur',
        label: '49,99 € / an',
        crossedAmount: '71,88 €',
        discountBadge: 'Économisez 30 %',
        note: 'Soit environ 4,16 €/mois (prix barré calculé sur 12 mensualités à 5,99 €)',
      },
    },
  },
};

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY manquante dans les variables d’environnement.');
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    appInfo: {
      name: 'Colorblop',
      version: '1.0.0',
    },
  });
}

/**
 * Assure que les produits et les 4 prix récurrents existent dans Stripe sans doublons.
 * Retourne un dictionnaire { [plan_interval]: priceId }.
 */
export async function ensureStripeProductsAndPrices(stripe) {
  // 1. Chercher les produits existants
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
      metadata: {
        app: 'colorblop',
        plan_id: PLANS.COLORVIP,
        commercial_license: 'false',
      },
    });
  }

  if (!prodPro) {
    prodPro = await stripe.products.create({
      name: 'ColorVIP Pro',
      description: PLAN_CONFIG[PLANS.COLORVIP_PRO].description,
      metadata: {
        app: 'colorblop',
        plan_id: PLANS.COLORVIP_PRO,
        commercial_license: 'true',
      },
    });
  }

  // 2. Chercher les prix récurrents existants
  const existingPrices = await stripe.prices.list({ limit: 100, active: true });
  
  async function findOrCreatePrice(product, amount, interval, planId) {
    // Vérification stricte pour éviter tout doublon
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
