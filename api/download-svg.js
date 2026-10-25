import fs from 'fs';
import path from 'path';
import { authenticateUser, supabaseAdmin, getUserSubscription } from './_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez GET.' });
  }

  try {
    // 1. Authentification
    // On supporte le header Bearer et le paramètre ?token= pour les téléchargements directs du navigateur
    let authReq = req;
    if (!req.headers.authorization && req.query.token) {
      authReq = {
        headers: {
          ...req.headers,
          authorization: `Bearer ${req.query.token}`,
        },
      };
    }

    const { user, error: authErr } = await authenticateUser(authReq);
    if (authErr || !user) {
      return res.status(401).json({
        error: 'Vous devez être connecté pour télécharger les fichiers SVG.',
        code: 'AUTH_REQUIRED',
      });
    }

    // 2. Vérification des droits d'abonnement
    // L'administrateur propriétaire flo83119@gmail.com a un accès illimité
    const isOwner = user.email?.toLowerCase() === 'flo83119@gmail.com' || user.id === 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

    let isAuthorized = isOwner;

    if (!isAuthorized) {
      const activeSub = await getUserSubscription(user.id);
      if (activeSub && ['active', 'trialing'].includes(activeSub.status)) {
        const periodEnd = new Date(activeSub.current_period_end).getTime();
        if (periodEnd > Date.now()) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Le téléchargement des fichiers SVG vectoriels est strictement réservé aux abonnés ColorVIP et ColorVIP Pro.',
        code: 'SUBSCRIPTION_REQUIRED',
        upgradeUrl: '/?tab=devenir-membre',
      });
    }

    // 3. Récupération du fichier SVG demandé
    const { id, slug, filename } = req.query;

    if (!id && !slug && !filename) {
      return res.status(400).json({ error: 'Identifiant du dessin manquant.' });
    }

    let svgBuffer = null;
    let downloadFilename = 'coloriage.svg';

    // Cas A : Dessin de la collection officielle Animaux (ex: cb-svg-animal-12 ou animal-svg-12)
    const animalMatch = (id || slug || filename || '').match(/animal[-_]?(?:svg[-_]?)?(\d+)/i);

    if (animalMatch) {
      const num = animalMatch[1];
      const filePath = path.join(process.cwd(), 'server', 'private-svg', 'animaux', `animal-${num}.svg`);

      if (fs.existsSync(filePath)) {
        svgBuffer = fs.readFileSync(filePath);
        downloadFilename = `animal-mignon-${num}.svg`;
      }
    }

    // Cas B : Dessin hébergé dans Supabase Storage (coloring_pages)
    if (!svgBuffer && (id || slug)) {
      let query = supabaseAdmin.from('coloring_pages').select('*');
      if (id) query = query.eq('id', id);
      else if (slug) query = query.eq('slug', slug);

      const { data: page, error: pageErr } = await query.maybeSingle();

      if (!pageErr && page?.image_path) {
        downloadFilename = `${page.slug || 'dessin'}.svg`;

        // Télécharger depuis le bucket Supabase Storage
        const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
          .from('colorings')
          .download(page.image_path);

        if (!downloadErr && fileData) {
          const arrayBuf = await fileData.arrayBuffer();
          svgBuffer = Buffer.from(arrayBuf);
        }
      }
    }

    if (!svgBuffer) {
      return res.status(404).json({ error: 'Fichier SVG vectoriel introuvable pour ce coloriage.' });
    }

    // 4. Envoi sécurisé du fichier SVG brut
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
    );
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    return res.status(200).send(svgBuffer);
  } catch (err) {
    console.error('Erreur download-svg:', err);
    return res.status(500).json({ error: 'Erreur lors du téléchargement sécurisé du SVG.' });
  }
}
