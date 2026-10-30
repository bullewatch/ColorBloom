import { authenticateUser, getSupabaseAdmin, getUserSubscription } from '../_lib/supabaseAdmin.js';
import { ANIMAL_SVGS } from '../_lib/privateSvgs.js';

/**
 * download-svg.js
 * Téléchargement sécurisé des fichiers SVG vectoriels sur Cloudflare Pages :
 * - Aucune dépendance à Cloudflare R2 : les 123 SVGs d'animaux sont intégrés en mémoire.
 * - Pour les coloriages ajoutés depuis l'espace propriétaire, téléchargement direct depuis le bucket Supabase Storage 'colorings'.
 * - Contrôle d'authentification et de souscription VIP (ou statut propriétaire) côté serveur.
 * - En-têtes stricts anti-cache et disposition 'attachment' pour forcer le téléchargement du fichier brut.
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    // 1. Authentification obligatoire via l'en-tête Authorization: Bearer uniquement
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.trim().toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({
          error: 'Vous devez être connecté pour télécharger les fichiers SVG.',
          code: 'AUTH_REQUIRED',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const bearerToken = authHeader.trim().slice(7).trim();
    if (!bearerToken) {
      return new Response(
        JSON.stringify({
          error: 'Vous devez être connecté pour télécharger les fichiers SVG.',
          code: 'AUTH_REQUIRED',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Interdiction formelle d'authentifier cet endpoint via ?token= :
    // On retire tout paramètre token de l'URL pour ne jamais s'appuyer sur la query string
    let authRequest = request;
    try {
      const parsedUrl = new URL(request.url);
      if (parsedUrl.searchParams.has('token')) {
        parsedUrl.searchParams.delete('token');
        authRequest = new Request(parsedUrl.toString(), {
          method: request.method || 'GET',
          headers: request.headers,
        });
      }
    } catch {
      // Conserve authRequest avec l'en-tête Authorization vérifié
    }

    const { user, error: authErr } = await authenticateUser(authRequest, env);
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

    let svgContent = null;
    let downloadFilename = 'coloriage.svg';

    // CAS A : Dessin de la collection Animaux (1 à 126) servi instantanément depuis le catalogue intégré
    const animalMatch = (id || slug || filename).match(/animal[-_]?(?:svg[-_]?)?(\d+)/i);

    if (animalMatch) {
      const num = animalMatch[1];
      const rawSvg = ANIMAL_SVGS[num];
      if (rawSvg) {
        svgContent = rawSvg;
        downloadFilename = `animal-mignon-${num}.svg`;
      }
    }

    // CAS B : Dessin hébergé dans Supabase Storage (provenant de l'Espace Propriétaire)
    if (!svgContent && (id || slug)) {
      const supabaseAdmin = getSupabaseAdmin(env);
      let query = supabaseAdmin.from('coloring_pages').select('*');
      if (id) query = query.eq('id', id);
      else if (slug) query = query.eq('slug', slug);

      const { data: page } = await query.maybeSingle();

      if (page?.image_path) {
        downloadFilename = `${page.slug || 'dessin'}.svg`;

        // Téléchargement sécurisé depuis le bucket Supabase Storage existant
        const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
          .from('colorings')
          .download(page.image_path);

        if (!downloadErr && fileData) {
          svgContent = await fileData.text();
        }
      }
    }

    if (!svgContent) {
      return new Response(
        JSON.stringify({ error: 'Fichier SVG vectoriel introuvable pour ce coloriage.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Envoi du fichier SVG en téléchargement direct
    const sanitizedFilename = downloadFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return new Response(svgContent, {
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
