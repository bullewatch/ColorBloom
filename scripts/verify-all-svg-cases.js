import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import * as fastPng from 'fast-png';
import {
  parseSvgMetadata,
  prepareHighResSvgString,
  detectDrawingBounds,
  calculateContainPlacement,
} from '../src/svgExport.js';

console.log('================================================================');
console.log('🔍 VÉRIFICATION EXHAUSTIVE DES EXPORTS SVG → PNG (TEST SUITE)');
console.log('================================================================\n');

const OUTPUT_DIR = path.join(process.cwd(), 'scratch', 'test-outputs');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Simule le moteur complet d'export avec les mêmes calculs que le canvas navigateur
 */
function renderSvgToPngBuffer(svgString, options = {}) {
  const targetW = options.targetWidth || 2400;
  const targetH = options.targetHeight || 3200;

  // 1. Préparation haute résolution
  const preparedSvg = prepareHighResSvgString(svgString, 3200);

  // 2. Rendu vectoriel ultra-net
  const resvg = new Resvg(preparedSvg, { fitTo: { mode: 'width', value: 3200 } });
  const rawPng = resvg.render().asPng();
  const decoded = fastPng.decode(rawPng);

  // 3. Détection des traits et suppression des marges vides excessives
  const bounds = detectDrawingBounds(decoded.data, decoded.width, decoded.height, {
    safetyPaddingRatio: 0.025,
  });

  // 4. Calcul de redimensionnement contain proportionnel et centrage
  const placement = calculateContainPlacement(bounds.cropW, bounds.cropH, targetW, targetH, {
    pageMarginRatio: 0.05,
  });

  // 5. Rendu sur canvas 2400x3200 fond blanc
  const finalChannels = 4;
  const finalBuffer = new Uint8Array(targetW * targetH * finalChannels);
  finalBuffer.fill(255); // #ffffff

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

      const srcIdx = (srcY * decoded.width + srcX) * 4;
      const destIdx = (destY * targetW + destX) * finalChannels;

      const alpha = decoded.data[srcIdx + 3] / 255;
      if (alpha > 0) {
        finalBuffer[destIdx] = Math.round(decoded.data[srcIdx] * alpha + 255 * (1 - alpha));
        finalBuffer[destIdx + 1] = Math.round(decoded.data[srcIdx + 1] * alpha + 255 * (1 - alpha));
        finalBuffer[destIdx + 2] = Math.round(decoded.data[srcIdx + 2] * alpha + 255 * (1 - alpha));
        finalBuffer[destIdx + 3] = 255;
      }
    }
  }

  const encoded = fastPng.encode({
    width: targetW,
    height: targetH,
    data: finalBuffer,
    channels: 4,
  });

  return {
    pngBuffer: encoded,
    decodedFinal: fastPng.decode(encoded),
    bounds,
    placement,
  };
}

/**
 * Analyse le PNG final généré pour vérifier centrage, dimensions, ratio et absence de déformation
 */
function verifyFinalPng(testName, result, expectedRatio, options = {}) {
  console.log(`\n📋 Évaluation du cas : [${testName}]`);
  const { decodedFinal, placement, bounds } = result;

  let passed = true;

  // 1. Dimensions du canvas
  const dimOk = decodedFinal.width === 2400 && decodedFinal.height === 3200;
  console.log(`  - Dimensions finales : ${decodedFinal.width}x${decodedFinal.height} (Attendu: 2400x3200) -> ${dimOk ? '✅' : '❌'}`);
  if (!dimOk) passed = false;

  // 2. Centrage
  const leftMargin = placement.destX;
  const rightMargin = 2400 - (placement.destX + placement.destW);
  const topMargin = placement.destY;
  const bottomMargin = 3200 - (placement.destY + placement.destH);

  const horizCentered = Math.abs(leftMargin - rightMargin) <= 2;
  const vertCentered = Math.abs(topMargin - bottomMargin) <= 2;

  console.log(`  - Marges H : Gauche=${leftMargin}px, Droite=${rightMargin}px (Delta: ${Math.abs(leftMargin - rightMargin)}px) -> ${horizCentered ? '✅ Centré' : '❌ Non centré'}`);
  console.log(`  - Marges V : Haut=${topMargin}px, Bas=${bottomMargin}px (Delta: ${Math.abs(topMargin - bottomMargin)}px) -> ${vertCentered ? '✅ Centré' : '❌ Non centré'}`);
  if (!horizCentered || !vertCentered) passed = false;

  // 3. Ratio et absence de déformation
  const actualRatio = placement.destW / placement.destH;
  const contentRatio = bounds.cropW / bounds.cropH;
  const distortion = Math.abs(actualRatio - contentRatio) / contentRatio;

  console.log(`  - Ratio dessin crop : ${contentRatio.toFixed(4)}, Ratio PNG rendu : ${actualRatio.toFixed(4)}`);
  console.log(`  - Taux de déformation : ${(distortion * 100).toFixed(4)}% -> ${distortion < 0.001 ? '✅ Strictement 0% (aucune déformation)' : '❌ Déformé'}`);
  if (distortion >= 0.001) passed = false;

  // 4. Détection des pixels sombres dans le PNG final pour confirmer la netteté et la présence
  let finalStrokes = 0;
  for (let i = 0; i < decodedFinal.data.length; i += 4) {
    if (decodedFinal.data[i] < 200 || decodedFinal.data[i + 1] < 200 || decodedFinal.data[i + 2] < 200) {
      finalStrokes++;
    }
  }
  const strokesOk = finalStrokes > 500;
  console.log(`  - Contours noirs détectés : ${finalStrokes} pixels -> ${strokesOk ? '✅ Contours nets et présents' : '❌ Aucun trait trouvé'}`);
  if (!strokesOk) passed = false;

  return passed;
}

// -------------------------------------------------------------
// CAS 1 : SVG CARRÉ (1:1, 1000x1000)
// -------------------------------------------------------------
const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <rect x="100" y="100" width="800" height="800" rx="40" fill="none" stroke="#000" stroke-width="16"/>
  <circle cx="500" cy="500" r="300" fill="none" stroke="#000" stroke-width="16"/>
  <path d="M500 200 L500 800 M200 500 L800 500" stroke="#000" stroke-width="12"/>
</svg>`;

const resSquare = renderSvgToPngBuffer(squareSvg);
fs.writeFileSync(path.join(OUTPUT_DIR, 'test-square.png'), resSquare.pngBuffer);
const squareOk = verifyFinalPng('1. SVG Carré (1000x1000)', resSquare, 1.0);

// -------------------------------------------------------------
// CAS 2 : SVG VERTICAL (1:2, 800x1600)
// -------------------------------------------------------------
const verticalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1600" viewBox="0 0 800 1600">
  <path d="M400 100 L700 800 L400 1500 L100 800 Z" fill="none" stroke="#000" stroke-width="20"/>
  <circle cx="400" cy="800" r="250" fill="none" stroke="#000" stroke-width="16"/>
</svg>`;

const resVertical = renderSvgToPngBuffer(verticalSvg);
fs.writeFileSync(path.join(OUTPUT_DIR, 'test-vertical.png'), resVertical.pngBuffer);
const verticalOk = verifyFinalPng('2. SVG Vertical (800x1600)', resVertical, 0.5);

// -------------------------------------------------------------
// CAS 3 : SVG HORIZONTAL (2:1, 1600x800)
// -------------------------------------------------------------
const horizontalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800" viewBox="0 0 1600 800">
  <rect x="50" y="100" width="1500" height="600" rx="50" fill="none" stroke="#000" stroke-width="18"/>
  <circle cx="400" cy="400" r="200" fill="none" stroke="#000" stroke-width="14"/>
  <circle cx="1200" cy="400" r="200" fill="none" stroke="#000" stroke-width="14"/>
  <line x1="600" y1="400" x2="1000" y2="400" stroke="#000" stroke-width="20"/>
</svg>`;

const resHorizontal = renderSvgToPngBuffer(horizontalSvg);
fs.writeFileSync(path.join(OUTPUT_DIR, 'test-horizontal.png'), resHorizontal.pngBuffer);
const horizontalOk = verifyFinalPng('3. SVG Horizontal (1600x800)', resHorizontal, 2.0);

// -------------------------------------------------------------
// CAS 4 : SVG AVEC DE TRÈS GRANDES MARGES INTERNES
// ViewBox = 3000x3000, mais dessin = 600x600 situé au centre (marges de 1200px !)
// -------------------------------------------------------------
const hugeMarginsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3000 3000">
  <!-- Espace blanc de 1200px tout autour -->
  <g transform="translate(1200, 1200)">
    <circle cx="300" cy="300" r="280" fill="none" stroke="#000" stroke-width="24"/>
    <polygon points="300,50 380,220 560,220 420,330 470,500 300,400 130,500 180,330 40,220 220,220" fill="none" stroke="#000" stroke-width="16"/>
  </g>
</svg>`;

const resHugeMargins = renderSvgToPngBuffer(hugeMarginsSvg);
fs.writeFileSync(path.join(OUTPUT_DIR, 'test-huge-margins.png'), resHugeMargins.pngBuffer);
const hugeMarginsOk = verifyFinalPng('4. SVG avec Grandes Marges Internes (3000x3000 avec motif 600x600)', resHugeMargins, 1.0);

// -------------------------------------------------------------
// CAS 5 : DESSIN RÉEL COLORBLOP animal-2.svg (1254x1254)
// -------------------------------------------------------------
const animal2Svg = fs.readFileSync('server/private-svg/animaux/animal-2.svg', 'utf8');
const resAnimal2 = renderSvgToPngBuffer(animal2Svg);
fs.writeFileSync(path.join(OUTPUT_DIR, 'test-animal-2.png'), resAnimal2.pngBuffer);
const animal2Ok = verifyFinalPng('5. Dessin officiel animal-2.svg', resAnimal2, 1.0);

// -------------------------------------------------------------
// CAS 6 : DESSIN RÉEL COLORBLOP animal-1.svg (2016x2416)
// -------------------------------------------------------------
const animal1Svg = fs.readFileSync('server/private-svg/animaux/animal-1.svg', 'utf8');
const resAnimal1 = renderSvgToPngBuffer(animal1Svg);
fs.writeFileSync(path.join(OUTPUT_DIR, 'test-animal-1.png'), resAnimal1.pngBuffer);
const animal1Ok = verifyFinalPng('6. Dessin officiel animal-1.svg', resAnimal1, 2016 / 2416);

console.log('\n================================================================');
const allPassed = squareOk && verticalOk && horizontalOk && hugeMarginsOk && animal2Ok && animal1Ok;
console.log(`BILAN GLOBAL : ${allPassed ? '🎉 TOUS LES TESTS SONT VALIDES À 100%' : '❌ CERTAINS TESTS ONT ÉCHOUÉ'}`);
console.log('================================================================\n');

if (!allPassed) {
  process.exit(1);
}
