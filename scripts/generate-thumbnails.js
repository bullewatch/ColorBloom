import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * generate-thumbnails.js
 * Génération automatique de miniatures WebP ultra-légères pour la galerie Colorblop.
 *
 * - Conserve le ratio d'aspect strict (sans étirement ni déformation).
 * - Préserve la netteté des contours noirs et blancs des coloriages.
 * - Réduit le poids de ~75% à 85% par image.
 * - Idempotent : ne régénère que si la miniature est absente ou si l'original est plus récent.
 * - Traitement parallèle pour exécution rapide en quelques secondes.
 */

const SOURCE_DIR = path.resolve('public', 'previews', 'animaux');
const OUTPUT_DIR = path.resolve('public', 'previews', 'animaux', 'thumbs');
const THUMB_WIDTH = 380;
const CONCURRENCY = 6;

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Dossier source introuvable: ${SOURCE_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'));
  console.log(`🖼️  Traitement optimisé de ${files.length} images dans ${SOURCE_DIR}...`);

  let createdCount = 0;
  let skippedCount = 0;
  let totalOrigSize = 0;
  let totalThumbSize = 0;

  async function processFile(file) {
    const inputPath = path.join(SOURCE_DIR, file);
    const baseName = path.basename(file, '.png');
    const outputPath = path.join(OUTPUT_DIR, `${baseName}.webp`);

    const inputStat = fs.statSync(inputPath);
    totalOrigSize += inputStat.size;

    if (fs.existsSync(outputPath)) {
      const outputStat = fs.statSync(outputPath);
      if (outputStat.mtimeMs >= inputStat.mtimeMs) {
        skippedCount++;
        totalThumbSize += outputStat.size;
        return;
      }
    }

    try {
      await sharp(inputPath)
        .resize({
          width: THUMB_WIDTH,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({
          quality: 82,
          effort: 4,
        })
        .toFile(outputPath);

      const thumbStat = fs.statSync(outputPath);
      totalThumbSize += thumbStat.size;
      createdCount++;
    } catch (err) {
      console.error(`Erreur sur ${file}:`, err);
    }
  }

  // File d'attente concurrente
  const queue = [...files];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const file = queue.shift();
      if (file) await processFile(file);
    }
  });

  await Promise.all(workers);

  const origMb = (totalOrigSize / (1024 * 1024)).toFixed(2);
  const thumbMb = (totalThumbSize / (1024 * 1024)).toFixed(2);
  const savedPercent = (((totalOrigSize - totalThumbSize) / totalOrigSize) * 100).toFixed(1);

  console.log(`✅ Miniatures WebP générées : ${createdCount} créées, ${skippedCount} déjà à jour.`);
  console.log(`📦 Poids total originaux PNG : ${origMb} Mo ➔ Miniatures WebP : ${thumbMb} Mo (${savedPercent}% d'économie de bande passante !)`);
}

main().catch(err => {
  console.error('Erreur génération miniatures:', err);
  process.exit(1);
});
