import { authenticateUser, supabaseAdmin } from './_lib/supabaseAdmin.js';

/**
 * Valide et verrouille définitivement le NOM et Prénom officiel du titulaire de licence.
 * Exige une double saisie de vérification pour éviter toute erreur.
 * Une fois verrouillé, il ne peut plus être modifié par l'utilisateur (anti-fraude).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: 'Vous devez être connecté.' });
    }

    const { name, nameConfirm } = req.body || {};
    const trimmed1 = (name || '').trim();
    const trimmed2 = (nameConfirm || '').trim();

    if (!trimmed1 || !trimmed2) {
      return res.status(400).json({ error: 'Veuillez renseigner votre Nom et Prénom dans les deux champs.' });
    }

    if (trimmed1.toLowerCase() !== trimmed2.toLowerCase()) {
      return res.status(400).json({ error: 'Les deux saisies du Nom et Prénom ne correspondent pas exactement.' });
    }

    if (trimmed1.length < 3) {
      return res.status(400).json({ error: 'Le Nom et Prénom doit comporter au moins 3 caractères.' });
    }

    const officialName = trimmed1.toUpperCase();

    // Vérifier si une licence existe pour cet utilisateur
    const { data: existingLic } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLic?.customer_name && existingLic.customer_name.trim().includes(' ') && existingLic.customer_name.trim() !== 'MEMBRE PRO COLORBLOP') {
      // Déjà verrouillé
      return res.status(400).json({
        error: 'Le titulaire officiel de cette licence a déjà été validé et verrouillé définitivement. Il ne peut plus être modifié.',
      });
    }

    if (existingLic?.id) {
      // Mettre à jour la licence existante
      await supabaseAdmin
        .from('licenses')
        .update({
          customer_name: officialName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLic.id);
    }

    // Mettre à jour le profil de l'utilisateur
    await supabaseAdmin
      .from('profiles')
      .update({
        display_name: officialName,
      })
      .eq('id', user.id);

    return res.status(200).json({
      success: true,
      customer_name: officialName,
      is_locked: true,
      message: 'Titulaire officiel validé et verrouillé avec succès.',
    });
  } catch (err) {
    console.error('Erreur lock-license-name:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur lors du verrouillage du titulaire.' });
  }
}
