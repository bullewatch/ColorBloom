import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import * as fastPng from 'fast-png';
import {
  parseDimensionToPx,
  parseSvgMetadata,
  prepareHighResSvgString,
  detectDrawingBounds,
  calculateContainPlacement,
} from '../src/svgExport.js';

console.log('====================================================');
console.log('🧪 LANCEMENT DES TESTS DU SYSTÈME D’EXPORT SVG → PNG');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------------------
// TEST 1 : Conversion d'unités de dimensions (pt, mm, cm, in, px)
// -------------------------------------------------------------------------
console.log('--- TEST 1 : Analyse des unités SVG ---');
assert(parseDimensionToPx('1200px') === 1200, '1200px -> 1200');
assert(Math.abs(parseDimensionToPx('2016.000000pt') - 2688) < 0.01, '2016pt -> 2688px (1pt = 1.33333px)');
assert(Math.abs(parseDimensionToPx('100mm') - 377.95) < 0.1, '100mm -> ~378px');
assert(Math.abs(parseDimensionToPx('10in') - 960) < 0.01, '10in -> 960px');
assert(parseDimensionToPx('500') === 500, '500 sans unité -> 500');

// -------------------------------------------------------------------------
// TEST 2 : Extraction viewBox et dimensions de divers types de SVGs
// -------------------------------------------------------------------------
console.log('\n--- TEST 2 : Extraction viewBox et détection automatique ---');

// Cas A : SVG Carré
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
  <circle cx="250" cy="250" r="200" fill="none" stroke="#000" stroke-width="10"/>
</svg>`;
const metaSquare = parseSvgMetadata(squareSvg);
assert(metaSquare.vbWidth === 500 && metaSquare.vbHeight === 500, 'SVG Carré : dimensions détectées (500x500)');
assert(metaSquare.aspectRatio === 1, 'SVG Carré : ratio 1.0 respecté');

// Cas B : SVG Vertical
const verticalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1200">
  <rect x="50" y="50" width="500" height="1100" fill="none" stroke="#000" stroke-width="10"/>
</svg>`;
const metaVertical = parseSvgMetadata(verticalSvg);
assert(metaVertical.vbWidth === 600 && metaVertical.vbHeight === 1200, 'SVG Vertical : viewBox détecté (600x1200)');
assert(metaVertical.aspectRatio === 0.5, 'SVG Vertical : ratio 0.5 (1:2) respecté');

// Cas C : SVG Horizontal
const horizontalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600px" height="800px" viewBox="0 0 1600 800">
  <ellipse cx="800" cy="400" rx="700" ry="300" fill="none" stroke="#000" stroke-width="12"/>
</svg>`;
const metaHorizontal = parseSvgMetadata(horizontalSvg);
assert(metaHorizontal.vbWidth === 1600 && metaHorizontal.vbHeight === 800, 'SVG Horizontal : dimensions détectées (1600x800)');
assert(metaHorizontal.aspectRatio === 2.0, 'SVG Horizontal : ratio 2.0 (2:1) respecté');

// Cas D : SVG avec viewBox décalé (minX / minY négatifs)
const offsetSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -50 800 400"></svg>`;
const metaOffset = parseSvgMetadata(offsetSvg);
assert(metaOffset.minX === -100 && metaOffset.minY === -50, 'SVG décalé : minX=-100 et minY=-50 correctement extraits');
assert(metaOffset.vbWidth === 800 && metaOffset.vbHeight === 400, 'SVG décalé : largeur 800 et hauteur 400 correctement extraites');

// -------------------------------------------------------------------------
// TEST 3 : Redimensionnement proportionnel contain (AUCUNE déformation)
// -------------------------------------------------------------------------
console.log('\n--- TEST 3 : Redimensionnement contain et centrage ---');

const TARGET_W = 2400;
const TARGET_H = 3200;

// Test Carré dans 2400x3200
const fitSquare = calculateContainPlacement(1000, 1000, TARGET_W, TARGET_H, { pageMarginRatio: 0.05 });
assert(fitSquare.destW === fitSquare.destH, 'Carré : largeur == hauteur après redimensionnement (pas d’écrasement)');
assert(fitSquare.destW <= TARGET_W * 0.90 && fitSquare.destH <= TARGET_H * 0.90, 'Carré : respecte la marge de page');
assert(fitSquare.destX === Math.round((TARGET_W - fitSquare.destW) / 2), 'Carré : centré horizontalement');
assert(fitSquare.destY === Math.round((TARGET_H - fitSquare.destH) / 2), 'Carré : centré verticalement');
const squareRatioDelta = Math.abs((fitSquare.destW / fitSquare.destH) - 1.0);
assert(squareRatioDelta < 0.001, 'Carré : distorsion 0%');

// Test Horizontal (2:1) dans 2400x3200
const fitHoriz = calculateContainPlacement(1600, 800, TARGET_W, TARGET_H, { pageMarginRatio: 0.05 });
const horizRatio = fitHoriz.destW / fitHoriz.destH;
assert(Math.abs(horizRatio - 2.0) < 0.01, 'Horizontal : ratio 2.0 conservé rigoureusement');
assert(fitHoriz.destX === Math.round((TARGET_W - fitHoriz.destW) / 2), 'Horizontal : centré horizontalement');
assert(fitHoriz.destY === Math.round((TARGET_H - fitHoriz.destH) / 2), 'Horizontal : centré verticalement');
assert(fitHoriz.destW <= TARGET_W && fitHoriz.destH <= TARGET_H, 'Horizontal : ne dépasse jamais le canvas');

// Test Vertical (1:2) dans 2400x3200
const fitVert = calculateContainPlacement(800, 1600, TARGET_W, TARGET_H, { pageMarginRatio: 0.05 });
const vertRatio = fitVert.destW / fitVert.destH;
assert(Math.abs(vertRatio - 0.5) < 0.01, 'Vertical : ratio 0.5 conservé rigoureusement');
assert(fitVert.destX === Math.round((TARGET_W - fitVert.destW) / 2), 'Vertical : centré horizontalement');
assert(fitVert.destY === Math.round((TARGET_H - fitVert.destH) / 2), 'Vertical : centré verticalement');

// -------------------------------------------------------------------------
// TEST 4 : Détection et suppression des grandes marges internes sans couper les traits
// -------------------------------------------------------------------------
console.log('\n--- TEST 4 : Détection et rognage des marges vides excessives ---');

// Créons un SVG de 2000x2000 avec un dessin de seulement 400x400 au milieu (marges de 800px de chaque côté !)
const hugeMarginSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 2000 2000">
  <rect width="2000" height="2000" fill="#ffffff"/>
  <!-- Dessin situé entre x=800..1200 et y=700..1100 -->
  <rect x="800" y="700" width="400" height="400" fill="#000000"/>
</svg>`;

// Rendu en mémoire via Resvg
const resvgHuge = new Resvg(hugeMarginSvg, { fitTo: { mode: 'width', value: 2000 } });
const renderedHuge = resvgHuge.render();
const decodedHuge = fastPng.decode(renderedHuge.asPng());

const detectedBounds = detectDrawingBounds(decodedHuge.data, decodedHuge.width, decodedHuge.height);

assert(!detectedBounds.isEmpty, 'Grandes marges : détection des traits réussie');
assert(detectedBounds.minX >= 795 && detectedBounds.minX <= 805, `minX détecté avec précision (~800, trouvé ${detectedBounds.minX})`);
assert(detectedBounds.minY >= 695 && detectedBounds.minY <= 705, `minY détecté avec précision (~700, trouvé ${detectedBounds.minY})`);
assert(detectedBounds.maxX >= 1195 && detectedBounds.maxX <= 1205, `maxX détecté avec précision (~1200, trouvé ${detectedBounds.maxX})`);
assert(detectedBounds.maxY >= 1095 && detectedBounds.maxY <= 1105, `maxY détecté avec précision (~1100, trouvé ${detectedBounds.maxY})`);

// Vérification de la marge de sécurité (safety padding)
assert(detectedBounds.cropX < detectedBounds.minX, 'Marge de sécurité : cropX inclut une marge avant le trait');
assert(detectedBounds.cropY < detectedBounds.minY, 'Marge de sécurité : cropY inclut une marge avant le trait');
assert(detectedBounds.cropX + detectedBounds.cropW > detectedBounds.maxX, 'Marge de sécurité : cropW inclut une marge après le trait');
assert(detectedBounds.cropY + detectedBounds.cropH > detectedBounds.maxY, 'Marge de sécurité : cropH inclut une marge après le trait');

// -------------------------------------------------------------------------
// TEST 5 : Test sur de véritables fichiers de Colorblop (animal-1.svg, animal-2.svg)
// -------------------------------------------------------------------------
console.log('\n--- TEST 5 : Dessins officiels Colorblop ---');

const animal1Path = path.join(process.cwd(), 'server', 'private-svg', 'animaux', 'animal-1.svg');
const animal2Path = path.join(process.cwd(), 'server', 'private-svg', 'animaux', 'animal-2.svg');

if (fs.existsSync(animal1Path)) {
  const svg1 = fs.readFileSync(animal1Path, 'utf8');
  const meta1 = parseSvgMetadata(svg1);
  assert(meta1.vbWidth === 2016 && meta1.vbHeight === 2416, 'animal-1.svg : viewBox 2016x2416 extrait correctement');
  const fit1 = calculateContainPlacement(meta1.vbWidth, meta1.vbHeight, TARGET_W, TARGET_H);
  const ratioBefore = meta1.vbWidth / meta1.vbHeight;
  const ratioAfter = fit1.destW / fit1.destH;
  assert(Math.abs(ratioBefore - ratioAfter) < 0.005, 'animal-1.svg : ratio 0.834 préservé à l’export (pas de déformation)');
}

if (fs.existsSync(animal2Path)) {
  const svg2 = fs.readFileSync(animal2Path, 'utf8');
  const meta2 = parseSvgMetadata(svg2);
  assert(meta2.vbWidth === 1254 && meta2.vbHeight === 1254, 'animal-2.svg : viewBox 1254x1254 extrait correctement');
  const fit2 = calculateContainPlacement(meta2.vbWidth, meta2.vbHeight, TARGET_W, TARGET_H);
  assert(fit2.destW === fit2.destH, 'animal-2.svg : dessin carré reste strictement carré (1:1)');
  assert(fit2.destX === Math.round((TARGET_W - fit2.destW) / 2), 'animal-2.svg : centré horizontalement');
  assert(fit2.destY === Math.round((TARGET_H - fit2.destH) / 2), 'animal-2.svg : centré verticalement');
}

// -------------------------------------------------------------------------
// TEST 6 : Simulation d'un export complet de bout en bout (PNG final généré)
// -------------------------------------------------------------------------
console.log('\n--- TEST 6 : Pipeline complet d’exportation vers PNG final ---');

function simulateExportToPng(svgStr, targetW = 2400, targetH = 3200) {
  // 1. Préparation haute résolution
  const preparedSvg = prepareHighResSvgString(svgStr, 3200);
  
  // 2. Rendu vectoriel haute précision via Resvg
  const resvg = new Resvg(preparedSvg, { fitTo: { mode: 'width', value: 3200 } });
  const rendered = resvg.render();
  const pngData = fastPng.decode(rendered.asPng());

  // 3. Détection des traits et rognage des marges vides
  const bounds = detectDrawingBounds(pngData.data, pngData.width, pngData.height);

  // 4. Calcul proportionnel contain & centrage
  const placement = calculateContainPlacement(bounds.cropW, bounds.cropH, targetW, targetH);

  // 5. Création du buffer final 2400x3200 fond blanc
  const finalChannels = 4;
  const finalBuffer = new Uint8Array(targetW * targetH * finalChannels);
  finalBuffer.fill(255); // Fond blanc pur #ffffff

  // Copie avec redimensionnement proportionnel
  const scaleX = bounds.cropW / placement.destW;
  const scaleY = bounds.cropH / placement.destH;

  for (let dy = 0; dy < placement.destH; dy++) {
    const srcY = Math.min(bounds.cropH - 1, Math.floor(dy * scaleY)) + bounds.cropY;
    const destY = placement.destY + dy;
    if (destY < 0 || destY >= targetH) continue;

    for (let dx = 0; dx < placement.destW; dx++) {
      const srcX = Math.min(bounds.cropW - 1, Math.floor(dx * scaleX)) + bounds.cropX;
      const destX = placement.destX + dx;
      if (destX < 0 || destX >= targetW) continue;

      const srcIdx = (srcY * pngData.width + srcX) * 4;
      const destIdx = (destY * targetW + destX) * finalChannels;

      const alpha = pngData.data[srcIdx + 3] / 255;
      if (alpha > 0) {
        // Alpha blending sur fond blanc
        finalBuffer[destIdx] = Math.round(pngData.data[srcIdx] * alpha + 255 * (1 - alpha));
        finalBuffer[destIdx + 1] = Math.round(pngData.data[srcIdx + 1] * alpha + 255 * (1 - alpha));
        finalBuffer[destIdx + 2] = Math.round(pngData.data[srcIdx + 2] * alpha + 255 * (1 - alpha));
        finalBuffer[destIdx + 3] = 255;
      }
    }
  }

  const encodedPng = fastPng.encode({
    width: targetW,
    height: targetH,
    data: finalBuffer,
    channels: 4,
  });

  return {
    encodedPng,
    placement,
    bounds,
  };
}

// Test A : Export complet d'un SVG carré avec grandes marges
const exportSquareResult = simulateExportToPng(hugeMarginSvg);
assert(exportSquareResult.placement.destW === exportSquareResult.placement.destH, 'Pipeline carré : résultat parfaitement proportionnel');
assert(exportSquareResult.placement.destX > 0 && exportSquareResult.placement.destY > 0, 'Pipeline carré : marges blanches ajoutées autour');
assert(exportSquareResult.encodedPng.length > 5000, `Pipeline carré : PNG généré avec succès (${exportSquareResult.encodedPng.length} octets)`);

// Test B : Export complet d'un SVG horizontal
const exportHorizResult = simulateExportToPng(horizontalSvg);
assert(exportHorizResult.placement.destW > exportHorizResult.placement.destH, 'Pipeline horizontal : format paysage préservé');
const cropRatioHoriz = exportHorizResult.bounds.cropW / exportHorizResult.bounds.cropH;
const destRatioHoriz = exportHorizResult.placement.destW / exportHorizResult.placement.destH;
assert(Math.abs(cropRatioHoriz - destRatioHoriz) < 0.01, 'Pipeline horizontal : ratio du dessin préservé sans déformation');
assert(exportHorizResult.encodedPng.length > 5000, `Pipeline horizontal : PNG généré avec succès (${exportHorizResult.encodedPng.length} octets)`);

// Test C : Export complet d'un SVG vertical
const exportVertResult = simulateExportToPng(verticalSvg);
assert(exportVertResult.placement.destH > exportVertResult.placement.destW, 'Pipeline vertical : format portrait préservé');
const cropRatioVert = exportVertResult.bounds.cropW / exportVertResult.bounds.cropH;
const destRatioVert = exportVertResult.placement.destW / exportVertResult.placement.destH;
assert(Math.abs(cropRatioVert - destRatioVert) < 0.01, 'Pipeline vertical : ratio du dessin préservé sans déformation');
assert(exportVertResult.encodedPng.length > 5000, `Pipeline vertical : PNG généré avec succès (${exportVertResult.encodedPng.length} octets)`);

console.log('\n====================================================');
console.log(`RÉSULTAT FINAL DES TESTS : ${passCount} réussis, ${failCount} échoués`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
