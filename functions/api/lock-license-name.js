import { authenticateUser, getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

/**
 * lock-license-name.js
 * Valide et verrouille définitivement le Nom & Prénom officiel du titulaire de licence commerciale ColorVIP Pro.
 * Sécurité anti-fraude irréversible.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { user, error: authError } = await authenticateUser(request, env);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Vous devez être connecté.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, nameConfirm } = body;
    const trimmed1 = (name || '').trim();
    const trimmed2 = (nameConfirm || '').trim();

    if (!trimmed1 || !trimmed2) {
      return new Response(
        JSON.stringify({ error: 'Veuillez renseigner votre Nom et Prénom dans les deux champs.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (trimmed1.toLowerCase() !== trimmed2.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Les deux saisies du Nom et Prénom ne correspondent pas exactement.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (trimmed1.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Le Nom et Prénom doit comporter au moins 3 caractères.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const officialName = trimmed1.toUpperCase();
    const supabaseAdmin = getSupabaseAdmin(env);

    // Vérifier si une licence existe pour cet utilisateur
    const { data: existingLic } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (
      existingLic?.customer_name &&
      existingLic.customer_name.trim().includes(' ') &&
      existingLic.customer_name.trim() !== 'MEMBRE PRO COLORBLOP'
    ) {
      return new Response(
        JSON.stringify({
          error: 'Le titulaire officiel de cette licence a déjà été validé et verrouillé définitivement. Il ne peut plus être modifié.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingLic?.id) {
      await supabaseAdmin
        .from('licenses')
        .update({
          customer_name: officialName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLic.id);
    }

    await supabaseAdmin
      .from('profiles')
      .update({ display_name: officialName })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        customer_name: officialName,
        is_locked: true,
        message: 'Titulaire officiel validé et verrouillé avec succès.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erreur lock-license-name:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur serveur lors du verrouillage du titulaire.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
