import { authenticateUser, getSupabaseAdmin, getUserSubscription } from '../_lib/supabaseAdmin.js';

/**
 * download-svg.js
 * Téléchargement ultra-sécurisé des fichiers SVG vectoriels sur Cloudflare Pages :
 * - Vérification stricte du jeton JWT Supabase
 * - Contrôle d'abonnement actif (ColorVIP / ColorVIP Pro) ou statut propriétaire
 * - Récupération du fichier source depuis le bucket Cloudflare R2 privé (sans aucun accès web direct)
 * - Repli automatique sur Supabase Storage pour les coloriages téléversés
 * - Envoi avec en-têtes de sécurité stricts (anti-cache et pièce jointe forcée)
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    // 1. Authentification obligatoire
    const { user, error: authErr } = await authenticateUser(request, env);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({
          error: 'Vous devez être connecté pour télécharger les fichiers SVG.',
          code: 'AUTH_REQUIRED',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Vérification des droits d'abonnement
    const isOwner =
      user.email?.toLowerCase() === 'flo83119@gmail.com' ||
      user.id === 'efd85ff7-77c2-4508-9493-156c58bbc9fa';

    let isAuthorized = isOwner;

    if (!isAuthorized) {
      const activeSub = await getUserSubscription(user.id, env);
      if (activeSub && ['active', 'trialing'].includes(activeSub.status)) {
        const periodEnd = new Date(activeSub.current_period_end).getTime();
        if (periodEnd > Date.now()) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          error: 'Le téléchargement des fichiers SVG vectoriels est strictement réservé aux abonnés ColorVIP et ColorVIP Pro.',
          code: 'SUBSCRIPTION_REQUIRED',
          upgradeUrl: '/?tab=devenir-membre',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Identification du dessin demandé
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || '';
    const slug = url.searchParams.get('slug') || '';
    const filename = url.searchParams.get('filename') || '';

    if (!id && !slug && !filename) {
      return new Response(
        JSON.stringify({ error: 'Identifiant du dessin manquant.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let svgData = null;
    let downloadFilename = 'coloriage.svg';

    // CAS A : Dessin de la collection Animaux (animal-1.svg à animal-126.svg)
    const animalMatch = (id || slug || filename).match(/animal[-_]?(?:svg[-_]?)?(\d+)/i);

    if (animalMatch) {
      const num = animalMatch[1];
      const r2Key = `animal-${num}.svg`;
      downloadFilename = `animal-mignon-${num}.svg`;

      // 1. Extraction prioritaire depuis le bucket Cloudflare R2 privé
      if (env.SVG_VAULT) {
        try {
          const r2Object = await env.SVG_VAULT.get(r2Key);
          if (r2Object) {
            svgData = r2Object.body;
          }
        } catch (r2Err) {
          console.warn('Erreur lecture R2:', r2Err);
        }
      }

      // 2. Repli de secours : Supabase Storage (si les SVGs y sont aussi synchronisés)
      if (!svgData) {
        try {
          const supabaseAdmin = getSupabaseAdmin(env);
          const { data: fileBlob } = await supabaseAdmin.storage
            .from('private-svgs')
            .download(`animaux/${r2Key}`);

          if (fileBlob) {
            svgData = fileBlob.stream();
          }
        } catch (supaStorageErr) {
          // Ignorer si non présent
        }
      }
    }

    // CAS B : Dessin hébergé dans Supabase Storage (coloring_pages)
    if (!svgData && (id || slug)) {
      const supabaseAdmin = getSupabaseAdmin(env);
      let query = supabaseAdmin.from('coloring_pages').select('*');
      if (id) query = query.eq('id', id);
      else if (slug) query = query.eq('slug', slug);

      const { data: page } = await query.maybeSingle();

      if (page?.image_path) {
        downloadFilename = `${page.slug || 'dessin'}.svg`;
        const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
          .from('colorings')
          .download(page.image_path);

        if (!downloadErr && fileData) {
          svgData = fileData.stream();
        }
      }
    }

    if (!svgData) {
      return new Response(
        JSON.stringify({ error: 'Fichier SVG vectoriel introuvable pour ce coloriage.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Envoi sécurisé en flux (Stream)
    const sanitizedFilename = downloadFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return new Response(svgData, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err) {
    console.error('Erreur download-svg:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur lors du téléchargement sécurisé du SVG.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
