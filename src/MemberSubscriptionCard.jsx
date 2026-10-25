import React, { useState } from 'react';
import { Crown, Sparkles, ShieldCheck, Download, ExternalLink, Calendar, FileBadge, ArrowRight, RefreshCw } from 'lucide-react';
import { generateCommercialLicensePdf } from './licensePdf';
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

  function handleDownloadLicense() {
    if (!license) return;

    generateCommercialLicensePdf({
      licenseNumber: license.license_number,
      holderName: license.customer_name || profile?.display_name || session?.user?.email?.split('@')[0],
      holderEmail: license.customer_email || session?.user?.email,
      interval: license.interval || sub?.interval || 'month',
      validFrom: license.valid_from || sub?.current_period_start,
      validUntil: license.valid_until || sub?.current_period_end,
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
                <b>
                  {sub?.current_period_start
                    ? new Date(sub.current_period_start).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'En cours'}
                </b>
              </div>
            </div>

            <div className="cb-sub-detail-item">
              <Calendar size={15} />
              <div>
                <small>{sub?.cancel_at_period_end ? 'Fin d’accès le :' : 'Prochaine échéance :'}</small>
                <b className={sub?.cancel_at_period_end ? 'text-warning' : 'text-success'}>
                  {sub?.current_period_end
                    ? new Date(sub.current_period_end).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'Période active'}
                </b>
              </div>
            </div>
          </div>

          {sub?.cancel_at_period_end && (
            <div className="cb-sub-cancel-notice">
              ⚠️ Votre résiliation a bien été prise en compte. Vos accès SVG restent pleinement actifs jusqu’au {new Date(sub.current_period_end).toLocaleDateString('fr-FR')}.
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
                <span>N° de licence : <b>{license?.license_number || 'CBL-PRO-EN-COURS'}</b></span>
                <span>Statut : <b className="text-success">Conforme & En vigueur</b></span>
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
