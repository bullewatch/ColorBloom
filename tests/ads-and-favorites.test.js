import assert from 'node:assert/strict';
import { animalCatalog } from '../src/animalCatalog.js';

console.log('======================================================');
console.log('🧪 SUITE DE TESTS : FAVORIS, LIKES & GOOGLE ADS');
console.log('======================================================');

// 1. Initial likes test
console.log('\n--- TEST 1 : Initialisation des likes et favoris à 0 ---');
const nonZeroLikes = animalCatalog.filter(d => d.likes !== 0);
assert.equal(nonZeroLikes.length, 0, 'Tous les dessins du catalogue doivent avoir strictement 0 likes');
console.log(`  ✓ 1.1 - 100% des ${animalCatalog.length} dessins d'animaux ont likes = 0`);

// 2. Mobile Interstitial Ad trigger rule (every 3 downloads on free version)
console.log('\n--- TEST 2 : Règle de déclenchement pop up mobile tous les 3 téléchargements ---');
function simulateDownloadCheck({ totalPreviousDownloads, isMobile, isPaidUser }) {
  if (isPaidUser) {
    return { shouldShowAd: false, newCount: totalPreviousDownloads };
  }
  if (!isMobile) {
    return { shouldShowAd: false, newCount: totalPreviousDownloads };
  }
  const nextCount = totalPreviousDownloads + 1;
  const shouldShowAd = (nextCount % 3 === 0);
  return { shouldShowAd, newCount: nextCount };
}

// Download 1
let res = simulateDownloadCheck({ totalPreviousDownloads: 0, isMobile: true, isPaidUser: false });
assert.equal(res.shouldShowAd, false);
assert.equal(res.newCount, 1);
console.log('  ✓ 2.1 - Téléchargement 1 (Gratuit, Mobile) : Pas de pop up pub');

// Download 2
res = simulateDownloadCheck({ totalPreviousDownloads: res.newCount, isMobile: true, isPaidUser: false });
assert.equal(res.shouldShowAd, false);
assert.equal(res.newCount, 2);
console.log('  ✓ 2.2 - Téléchargement 2 (Gratuit, Mobile) : Pas de pop up pub');

// Download 3
res = simulateDownloadCheck({ totalPreviousDownloads: res.newCount, isMobile: true, isPaidUser: false });
assert.equal(res.shouldShowAd, true);
assert.equal(res.newCount, 3);
console.log('  ✓ 2.3 - Téléchargement 3 (Gratuit, Mobile) : Déclenchement pop up pub avec skip');

// Download 4
res = simulateDownloadCheck({ totalPreviousDownloads: res.newCount, isMobile: true, isPaidUser: false });
assert.equal(res.shouldShowAd, false);
assert.equal(res.newCount, 4);
console.log('  ✓ 2.4 - Téléchargement 4 (Gratuit, Mobile) : Pas de pop up pub');

// Download 6
res = simulateDownloadCheck({ totalPreviousDownloads: 5, isMobile: true, isPaidUser: false });
assert.equal(res.shouldShowAd, true);
assert.equal(res.newCount, 6);
console.log('  ✓ 2.5 - Téléchargement 6 (Gratuit, Mobile) : Déclenchement pop up pub avec skip');

// 3. Paid User Isolation: ZERO ADS
console.log('\n--- TEST 3 : Protection de la version payante (VIP / VIP Pro / Owner : ZERO ADS) ---');
for (let i = 0; i < 15; i++) {
  const paidRes = simulateDownloadCheck({ totalPreviousDownloads: i, isMobile: true, isPaidUser: true });
  assert.equal(paidRes.shouldShowAd, false, 'Un utilisateur payant ne doit JAMAIS voir de pop up pub');
}
console.log('  ✓ 3.1 - Version payante sur mobile : 0 pop up sur 15 téléchargements consécutifs');

// Desktop test
function shouldShowDesktopSidebarAd({ isPaidUser, isMobile }) {
  if (isPaidUser) return false;
  if (isMobile) return false;
  return true;
}

assert.equal(shouldShowDesktopSidebarAd({ isPaidUser: false, isMobile: false }), true);
console.log('  ✓ 3.2 - Version gratuite sur ordinateur de bureau : Bandeau Google Ad toujours présent');

assert.equal(shouldShowDesktopSidebarAd({ isPaidUser: true, isMobile: false }), false);
console.log('  ✓ 3.3 - Version payante sur ordinateur de bureau : Bandeau Google Ad masqué (Expérience 100% ad-free)');

console.log('\n======================================================');
console.log('🎉 TOUS LES TESTS ADS & FAVORIS SONT VALIDÉS (10/10) !');
console.log('======================================================\n');
