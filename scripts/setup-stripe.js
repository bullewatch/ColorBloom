import 'dotenv/config';
import { getStripe, ensureStripeProductsAndPrices } from '../api/_lib/stripe.js';

async function main() {
  console.log('🚀 Initialisation et vérification des produits & tarifs Stripe COLORBLOP...\n');

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ ERREUR : La variable d’environnement STRIPE_SECRET_KEY est absente.');
    console.error('   Définissez-la dans un fichier .env ou passez-la en variable d’environnement.');
    console.error('   Exemple: STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe.js\n');
    process.exit(1);
  }

  const isTest = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  if (!isTest) {
    console.warn('⚠️ ATTENTION : Vous n’êtes pas en mode test (sk_test_) !');
  } else {
    console.log('🛡️ Mode TEST Stripe détecté (sk_test_...). Aucune transaction réelle ne sera effectuée.');
  }

  const stripe = getStripe();

  try {
    const result = await ensureStripeProductsAndPrices(stripe);
    console.log('\n✅ Configuration Stripe validée avec succès !');
    console.log('--------------------------------------------------');
    console.log('Produits créés / vérifiés :');
    console.log(` - ColorVIP     : ${result.products.colorvip}`);
    console.log(` - ColorVIP Pro : ${result.products.colorvip_pro}`);
    console.log('\nTarifs récurrents créés / vérifiés :');
    console.log(` - ColorVIP Mensuel (2,99 €)     : ${result.prices.colorvip_month}`);
    console.log(` - ColorVIP Annuel (24,99 €)     : ${result.prices.colorvip_year}`);
    console.log(` - ColorVIP Pro Mensuel (5,99 €) : ${result.prices.colorvip_pro_month}`);
    console.log(` - ColorVIP Pro Annuel (49,99 €) : ${result.prices.colorvip_pro_year}`);
    console.log('--------------------------------------------------\n');
    console.log('ℹ️ Vous pouvez maintenant reporter ces Price IDs dans vos variables d’environnement Vercel si vous le souhaitez.');
  } catch (err) {
    console.error('❌ Erreur lors de la configuration Stripe :', err);
    process.exit(1);
  }
}

main();
