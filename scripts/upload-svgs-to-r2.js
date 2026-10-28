import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * upload-svgs-to-r2.js
 * Téléverse automatiquement les 123 fichiers SVG privés vers le bucket Cloudflare R2 'colorblop-svg-vault'.
 *
 * Utilisation :
 * 1. Assurez-vous d'avoir créé le bucket sur Cloudflare : npx wrangler r2 bucket create colorblop-svg-vault
 * 2. Lancez ce script : node scripts/upload-svgs-to-r2.js
 */

const SVGS_DIR = path.resolve('server', 'private-svg', 'animaux');
const BUCKET_NAME = 'colorblop-svg-vault';

async function main() {
  if (!fs.existsSync(SVGS_DIR)) {
    console.error(`Dossier introuvable: ${SVGS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SVGS_DIR).filter(f => f.endsWith('.svg'));
  console.log(`📦 Début du téléversement de ${files.length} fichiers SVG vers le bucket R2 '${BUCKET_NAME}'...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(SVGS_DIR, file);
    const r2Key = `${BUCKET_NAME}/${file}`;

    process.stdout.write(`[${i + 1}/${files.length}] Envoi de ${file}... `);

    try {
      execSync(`npx wrangler r2 object put "${r2Key}" --file="${filePath}" --content-type="image/svg+xml"`, {
        stdio: 'pipe',
      });
      console.log('✅ OK');
      successCount++;
    } catch (err) {
      console.log('❌ Échec');
      console.error(`Détail erreur sur ${file}:`, err.message);
      failCount++;
    }
  }

  console.log(`\n🎉 Téléversement terminé : ${successCount} succès, ${failCount} erreurs.`);
  if (failCount > 0) {
    console.log('💡 Note : Connectez-vous préalablement à Cloudflare avec : npx wrangler login');
  }
}

main().catch(console.error);
