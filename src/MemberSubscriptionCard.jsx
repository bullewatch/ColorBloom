import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, Download, Calendar, FileBadge, ArrowRight, RefreshCw, Lock, CheckCircle2, ShieldAlert, Check } from 'lucide-react';
import { generateCommercialLicensePdf, calculateLicenseDates } from './licensePdf';
import { supabase } from './supabase';

export function MemberSubscriptionCard({
  session,
  profile,
  subscriptionData,
  onNavigateToMembership,
  onRefreshSubscription,
}) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionNotice, setActionNotice] = useState({ type: '', msg: '' });

  const sub = subscriptionData?.subscription;
  const license = subscriptionData?.license;
  const isOwner = subscriptionData?.isOwner;
  const isActive = subscriptionData?.hasActiveSubscription;
  const planId = sub?.plan_id;

  // Calcul exact des dates (même jour calendaire)
  const dates = calculateLicenseDates(
    license?.valid_from || sub?.current_period_start,
    license?.interval || sub?.interval || 'month',
    license?.valid_until || sub?.current_period_end
  );

  // Vérification si le titulaire officiel est définitivement verrouillé
  const currentLicName = (license?.customer_name || '').trim();
  const isHolderLocked = Boolean(
    currentLicName &&
    currentLicName.includes(' ') &&
    currentLicName !== 'MEMBRE PRO COLORBLOP' &&
    currentLicName !== 'FLORIAN (ARTISTE & PROPRIÉTAIRE COLORBLOP)'
  ) || isOwner;

  // Formulaire de double saisie pour verrouillage initial si non verrouillé
  const [holderInput1, setHolderInput1] = useState(currentLicName || profile?.display_name || '');
  const [holderInput2, setHolderInput2] = useState('');
  const [lockError, setLockError] = useState('');
  const [savingHolder, setSavingHolder] = useState(false);

  // Gestion native de la résiliation (arrêt du renouvellement automatique sans compte Stripe)
  async function handleCancelRenewal() {
    const confirmMsg = `Arrêter le renouvellement automatique ?\n\nVos téléchargements SVG et vos accès restent pleinement actifs jusqu’au ${dates.formattedEnd}.\nVous ne serez plus débité après cette date. Vous pourrez reprendre le renouvellement quand vous le souhaitez.`;
    if (!window.confirm(confirmMsg)) return;

    setLoadingAction(true);
    setActionNotice({ type: '', msg: '' });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/api/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Impossible d’arrêter le renouvellement automatique.');
      }

      setActionNotice({ type: 'success', msg: data.message });
      if (onRefreshSubscription) onRefreshSubscription();
    } catch (err) {
      console.error(err);
      setActionNotice({ type: 'error', msg: err.message || 'Erreur lors de la modification de l’abonnement.' });
    } finally {
      setLoadingAction(false);
    }
  }

  // Reprise du renouvellement automatique directement depuis Colorblop
  async function handleResumeRenewal() {
    setLoadingAction(true);
    setActionNotice({ type: '', msg: '' });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/api/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reactivate' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Impossible de réactiver le renouvellement automatique.');
      }

      setActionNotice({ type: 'success', msg: data.message });
      if (onRefreshSubscription) onRefreshSubscription();
    } catch (err) {
      console.error(err);
      setActionNotice({ type: 'error', msg: err.message || 'Erreur lors de la réactivation.' });
    } finally {
      setLoadingAction(false);
    }
  }

  // Verrouillage définitif du Nom et Prénom avec double saisie de vérification
  async function handleLockName(e) {
    if (e) e.preventDefault();
    setLockError('');

    const n1 = holderInput1.trim();
    const n2 = holderInput2.trim();

    if (!n1 || !n2) {
      setLockError('Veuillez renseigner votre Nom et Prénom dans les deux champs.');
      return;
    }

    if (!n1.includes(' ')) {
      setLockError('Veuillez renseigner à la fois votre NOM et votre Prénom (séparés par un espace).');
      return;
    }

    if (n1.toLowerCase() !== n2.toLowerCase()) {
      setLockError('Les deux saisies ne correspondent pas. Veuillez vérifier l’orthographe.');
      return;
    }

    setSavingHolder(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/api/lock-license-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: n1,
          nameConfirm: n2,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Impossible d’enregistrer le titulaire officiel.');
      }

      setActionNotice({ type: 'success', msg: 'Titulaire officiel validé et verrouillé définitivement.' });
      if (onRefreshSubscription) onRefreshSubscription();
    } catch (err) {
      console.error(err);
      setLockError(err.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setSavingHolder(false);
    }
  }

  function handleDownloadLicense() {
    const verifiedHolder = (license?.customer_name || profile?.display_name || 'DUPONT JEAN').trim();

    generateCommercialLicensePdf({
      licenseNumber: license?.license_number || 'CBL-2026-PRO-OFFICIEL',
      holderName: verifiedHolder,
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

      {actionNotice.msg && (
        <div className={`cb-sub-notice-banner ${actionNotice.type}`}>
          {actionNotice.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
          <span>{actionNotice.msg}</span>
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
                <small>{sub?.cancel_at_period_end ? 'Accès SVG valide jusqu’au :' : 'Prochaine échéance :'}</small>
                <b className={sub?.cancel_at_period_end ? 'text-warning' : 'text-success'}>
                  {dates.formattedEnd}
                </b>
              </div>
            </div>
          </div>

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

              {/* GESTION DU TITULAIRE : SOIT VERROUILLÉ DÉFINITIF, SOIT DOUBLE SAISIE OBLIGATOIRE */}
              {isHolderLocked ? (
                <div className="cb-license-holder-locked-box">
                  <div className="cb-license-locked-head">
                    <span className="cb-license-locked-label">Titulaire officiel certifié :</span>
                    <span className="cb-license-locked-badge">
                      <Lock size={12} /> Verrouillé définitivement
                    </span>
                  </div>
                  <div className="cb-license-locked-name">{currentLicName || 'FLORIAN'}</div>
                  <small className="cb-license-locked-info">
                    Ce nom est inscrit sur votre attestation officielle et ne peut plus être modifié (protection anti-fraude).
                  </small>
                </div>
              ) : (
                <div className="cb-license-holder-unlock-box">
                  <div className="cb-license-lock-title">
                    <ShieldAlert size={16} color="#d97706" />
                    <span>Valider votre NOM et Prénom pour l'attestation</span>
                  </div>
                  <p className="cb-license-lock-desc">
                    Veuillez saisir votre <b>NOM et Prénom</b> deux fois. Une fois validé, il sera définitivement verrouillé.
                  </p>

                  <div className="cb-lock-inputs-grid">
                    <input
                      type="text"
                      className="cb-lock-input"
                      value={holderInput1}
                      onChange={e => setHolderInput1(e.target.value)}
                      placeholder="NOM et Prénom (ex: DUPONT Jean)"
                    />
                    <input
                      type="text"
                      className="cb-lock-input"
                      value={holderInput2}
                      onChange={e => setHolderInput2(e.target.value)}
                      placeholder="Confirmez votre NOM et Prénom"
                    />
                  </div>

                  {lockError && <div className="cb-lock-error-msg">{lockError}</div>}

                  <button
                    type="button"
                    className="cb-btn-lock-submit"
                    onClick={handleLockName}
                    disabled={savingHolder || !holderInput1.trim() || !holderInput2.trim()}
                  >
                    <Check size={14} />
                    <span>{savingHolder ? 'Verrouillage en cours…' : 'Enregistrer définitivement mon nom'}</span>
                  </button>
                </div>
              )}

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

          {/* GESTION DU RENOUVELLEMENT DIRECTEMENT DANS COLORBLOP (SANS COMPTE STRIPE) */}
          {!isOwner && (
            <div className="cb-sub-management-box">
              {sub?.cancel_at_period_end ? (
                <div className="cb-renewal-card canceled">
                  <div className="cb-renewal-info">
                    <ShieldAlert size={18} className="cb-renewal-icon warning" />
                    <div>
                      <b>Renouvellement automatique arrêté</b>
                      <p>Vos accès SVG restent pleinement actifs jusqu’au {dates.formattedEnd}. Vous ne serez plus débité.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cb-btn-resume-sub"
                    onClick={handleResumeRenewal}
                    disabled={loadingAction}
                  >
                    <RefreshCw size={14} className={loadingAction ? 'cb-spin' : ''} />
                    <span>{loadingAction ? 'Réactivation…' : 'Reprendre le renouvellement automatique'}</span>
                  </button>
                </div>
              ) : (
                <div className="cb-renewal-card active">
                  <div className="cb-renewal-info">
                    <CheckCircle2 size={18} className="cb-renewal-icon success" />
                    <div>
                      <b>Renouvellement automatique actif</b>
                      <p>Votre abonnement se renouvelle automatiquement à chaque échéance. Vous pouvez l’arrêter à tout moment.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cb-btn-cancel-sub"
                    onClick={handleCancelRenewal}
                    disabled={loadingAction}
                  >
                    <span>{loadingAction ? 'Arrêt en cours…' : 'Arrêter le renouvellement automatique'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
