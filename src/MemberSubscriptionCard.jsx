import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, Download, ExternalLink, Calendar, FileBadge, ArrowRight, RefreshCw, Edit2, Check } from 'lucide-react';
import { generateCommercialLicensePdf, calculateLicenseDates } from './licensePdf';
import { supabase } from './supabase';

export function MemberSubscriptionCard({
  session,
  profile,
  subscriptionData,
  onNavigateToMembership,
  onRefreshSubscription,
}) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState('');

  const sub = subscriptionData?.subscription;
  const license = subscriptionData?.license;
  const isOwner = subscriptionData?.isOwner;
  const isActive = subscriptionData?.hasActiveSubscription;
  const planId = sub?.plan_id;

  // Gestion du titulaire (NOM et Prénom)
  const defaultHolder =
    license?.customer_name ||
    profile?.display_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    '';

  const [holderName, setHolderName] = useState(defaultHolder);
  const [isEditingHolder, setIsEditingHolder] = useState(false);
  const [savingHolder, setSavingHolder] = useState(false);

  useEffect(() => {
    if (license?.customer_name) {
      setHolderName(license.customer_name);
    } else if (profile?.display_name) {
      setHolderName(profile.display_name);
    }
  }, [license?.customer_name, profile?.display_name]);

  const dates = calculateLicenseDates(
    license?.valid_from || sub?.current_period_start,
    license?.interval || sub?.interval || 'month',
    license?.valid_until || sub?.current_period_end
  );

  async function handleOpenPortal() {
    setLoadingPortal(true);
    setPortalError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Impossible d’ouvrir le portail client Stripe.');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setPortalError(err.message || 'Erreur lors de l’ouverture du portail de facturation.');
      setLoadingPortal(false);
    }
  }

  async function handleSaveHolder() {
    const trimmed = holderName.trim();
    if (!trimmed) return;
    setSavingHolder(true);
    try {
      if (session?.user?.id) {
        // Mettre à jour dans la table licenses
        await supabase
          .from('licenses')
          .update({ customer_name: trimmed, updated_at: new Date().toISOString() })
          .eq('user_id', session.user.id);

        // Mettre à jour le profil également
        await supabase
          .from('profiles')
          .update({ display_name: trimmed })
          .eq('id', session.user.id);
      }

      setIsEditingHolder(false);
      if (onRefreshSubscription) onRefreshSubscription();
    } catch (err) {
      console.warn('Erreur mise à jour titulaire:', err);
    } finally {
      setSavingHolder(false);
    }
  }

  function handleDownloadLicense() {
    let finalHolder = (holderName || '').trim();

    // Si le nom ressemble à un simple pseudo ou email sans espace, on propose de confirmer le Nom et Prénom
    if (!finalHolder || (!finalHolder.includes(' ') && finalHolder.toLowerCase().includes('@'))) {
      const prompted = window.prompt(
        "Veuillez renseigner votre NOM et Prénom pour l'attestation officielle de licence commerciale (ex: DUPONT Jean) :",
        finalHolder || ''
      );
      if (prompted && prompted.trim()) {
        finalHolder = prompted.trim();
        setHolderName(finalHolder);
        if (session?.user?.id) {
          supabase.from('licenses').update({ customer_name: finalHolder }).eq('user_id', session.user.id);
        }
      }
    }

    generateCommercialLicensePdf({
      licenseNumber: license?.license_number || 'CBL-2026-PRO-OFFICIEL',
      holderName: finalHolder || 'DUPONT Jean',
      holderEmail: license?.customer_email || session?.user?.email,
      interval: license?.interval || sub?.interval || 'month',
      validFrom: license?.valid_from || sub?.current_period_start,
      validUntil: license?.valid_until || sub?.current_period_end,
    });
  }

  return (
    <div className="cb-my-subscription-card">
      <div className="cb-my-sub-header">
        <div className="cb-my-sub-title-wrap">
          <Crown className="cb-my-sub-crown" />
          <h3>Mon abonnement</h3>
        </div>

        {onRefreshSubscription && (
          <button
            type="button"
            className="cb-sub-refresh-btn"
            onClick={onRefreshSubscription}
            title="Actualiser mon statut"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {portalError && (
        <div className="cb-membership-error-banner" style={{ margin: '8px 0' }}>
          {portalError}
        </div>
      )}

      {/* CAS 1 : Utilisateur sans abonnement actif */}
      {!isActive ? (
        <div className="cb-sub-box-free">
          <div className="cb-sub-badge-free">Formule Gratuite</div>
          <p className="cb-sub-free-desc">
            Vous bénéficiez actuellement des téléchargements <b>PNG</b> et <b>PDF A4</b> illimités.
          </p>
          <div className="cb-sub-free-callout">
            <Sparkles size={18} color="#5a381d" />
            <span>Passez à <b>ColorVIP</b> ou <b>ColorVIP Pro</b> pour débloquer tous les téléchargements <b>SVG vectoriels</b> !</span>
          </div>
          <button
            type="button"
            className="cb-sub-upgrade-btn"
            onClick={onNavigateToMembership}
          >
            <span>Découvrir les formules VIP & Pro</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        /* CAS 2 : Utilisateur avec abonnement actif (ColorVIP ou ColorVIP Pro ou Propriétaire) */
        <div className={`cb-sub-box-active ${planId === 'colorvip_pro' ? 'is-pro' : ''}`}>
          <div className="cb-sub-active-top">
            <div>
              <span className={`cb-sub-plan-pill ${planId === 'colorvip_pro' ? 'pro' : 'vip'}`}>
                {planId === 'colorvip_pro' ? 'ColorVIP Pro' : 'ColorVIP'}
              </span>
              <span className="cb-sub-status-pill active">Actif ✓</span>
            </div>

            <div className="cb-sub-price-tag">
              {sub?.amount ? (
                <>
                  <b>{(sub.amount / 100).toFixed(2).replace('.', ',')} €</b>
                  <small> / {sub.interval === 'year' ? 'an' : 'mois'}</small>
                </>
              ) : isOwner ? (
                <b>Accès Propriétaire Illimité</b>
              ) : null}
            </div>
          </div>

          <div className="cb-sub-details-grid">
            <div className="cb-sub-detail-item">
              <Calendar size={15} />
              <div>
                <small>Date de début :</small>
                <b>{dates.formattedStart}</b>
              </div>
            </div>

            <div className="cb-sub-detail-item">
              <Calendar size={15} />
              <div>
                <small>{sub?.cancel_at_period_end ? 'Fin d’accès le :' : 'Prochaine échéance :'}</small>
                <b className={sub?.cancel_at_period_end ? 'text-warning' : 'text-success'}>
                  {dates.formattedEnd}
                </b>
              </div>
            </div>
          </div>

          {sub?.cancel_at_period_end && (
            <div className="cb-sub-cancel-notice">
              ⚠️ Votre résiliation a bien été prise en compte. Vos accès SVG restent pleinement actifs jusqu’au {dates.formattedEnd}.
            </div>
          )}

          {/* LICENCE COMMERCIALE (Réservée exclusivement à ColorVIP Pro) */}
          {planId === 'colorvip_pro' && (
            <div className="cb-sub-license-box">
              <div className="cb-license-header">
                <FileBadge className="cb-license-icon" />
                <div>
                  <h4>Licence Commerciale Nominative</h4>
                  <p>Autorise la vente de vos créations physiques (t-shirts, mugs, papeterie, stickers).</p>
                </div>
              </div>

              <div className="cb-license-info-row">
                <span>N° de série : <b>{license?.license_number || 'CBL-2026-FL83-MSTR-9901'}</b></span>
                <span>Statut : <b className="text-success">Conforme & En vigueur ✓</b></span>
              </div>

              <div className="cb-license-holder-box">
                <div className="cb-license-holder-label">Titulaire officiel (NOM et Prénom) :</div>
                {isEditingHolder ? (
                  <div className="cb-license-holder-edit-wrap">
                    <input
                      type="text"
                      className="cb-license-holder-input"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder="ex: DUPONT Jean"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="cb-btn-save-holder"
                      onClick={handleSaveHolder}
                      disabled={savingHolder}
                    >
                      <Check size={14} />
                      <span>{savingHolder ? 'Enregistrement…' : 'Valider'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="cb-license-holder-display">
                    <b className="cb-license-holder-name">{holderName || 'Non renseigné'}</b>
                    <button
                      type="button"
                      className="cb-btn-edit-holder"
                      onClick={() => setIsEditingHolder(true)}
                      title="Modifier le Nom et Prénom pour l'attestation PDF"
                    >
                      <Edit2 size={13} />
                      <span>Modifier</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="cb-license-dates-row">
                <span>Validité : Du <b>{dates.formattedStart}</b> au <b>{dates.formattedEnd}</b></span>
              </div>

              <button
                type="button"
                className="cb-btn-download-license"
                onClick={handleDownloadLicense}
              >
                <Download size={15} />
                <span>Télécharger mon attestation officielle (PDF)</span>
              </button>
            </div>
          )}

          {/* Actions : Portail Stripe */}
          <div className="cb-sub-actions-row">
            <button
              type="button"
              className="cb-btn-portal"
              onClick={handleOpenPortal}
              disabled={loadingPortal}
            >
              <ExternalLink size={15} />
              <span>{loadingPortal ? 'Ouverture Stripe…' : 'Gérer mon abonnement / Factures / Moyen de paiement'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
