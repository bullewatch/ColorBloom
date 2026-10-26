import React, { useState } from 'react';
import { X, Lock, Crown, Sparkles, Check, ArrowRight } from 'lucide-react';
import { supabase } from './supabase';
import { ProIdentityModal } from './ProIdentityModal';

export function MembershipModal({
  isOpen,
  onClose,
  session,
  onOpenProfile,
  drawingTitle = 'ce coloriage',
}) {
  const [interval, setInterval] = useState('year');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProIdentityModalOpen, setIsProIdentityModalOpen] = useState(false);

  if (!isOpen) return null;

  async function executeCheckout(planId, customerName = null) {
    setErrorMsg('');
    setLoadingPlan(planId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId,
          interval,
          customerName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Impossible de créer la session de paiement.');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Une erreur est survenue.');
      setLoadingPlan(null);
      setIsProIdentityModalOpen(false);
    }
  }

  function handleSubscribe(planId) {
    setErrorMsg('');

    if (!session?.user) {
      onClose();
      if (onOpenProfile) onOpenProfile();
      return;
    }

    if (planId === 'colorvip_pro') {
      setIsProIdentityModalOpen(true);
      return;
    }

    executeCheckout(planId, null);
  }

  return (
    <div className="modal cb-membership-modal-overlay" onClick={onClose}>
      <div className="cb-membership-modal-card" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Fermer"><X /></button>

        <div className="cb-modal-vip-badge">
          <Lock size={18} />
          <span>Format SVG Vectoriel Réservé aux Membres</span>
        </div>

        <h2>Débloquez les SVG de Colorblop</h2>
        <p className="cb-modal-vip-sub">
          Les fichiers SVG de « {drawingTitle} » et de toute la collection sont réservés aux abonnés <b>ColorVIP</b> et <b>ColorVIP Pro</b>.
        </p>

        {errorMsg && (
          <div className="cb-membership-error-banner" style={{ margin: '10px 0' }}>
            {errorMsg}
          </div>
        )}

        {/* Mini switcher */}
        <div className="cb-modal-interval-pill">
          <button
            type="button"
            className={interval === 'month' ? 'active' : ''}
            onClick={() => setInterval('month')}
          >
            Mensuel
          </button>
          <button
            type="button"
            className={interval === 'year' ? 'active' : ''}
            onClick={() => setInterval('year')}
          >
            Annuel (-30%)
          </button>
        </div>

        {/* 2 Plans */}
        <div className="cb-modal-plans-row">
          {/* VIP */}
          <div className="cb-modal-plan-box">
            <div className="cb-modal-plan-head">
              <h3>ColorVIP</h3>
              <div className="cb-modal-price">
                {interval === 'year' ? (
                  <>
                    <span className="cb-m-crossed">35,88 €</span>
                    <b>24,99 €</b> <small>/ an</small>
                  </>
                ) : (
                  <>
                    <b>2,99 €</b> <small>/ mois</small>
                  </>
                )}
              </div>
            </div>
            <ul className="cb-modal-list">
              <li><Check size={14} color="#2e7d32" /> SVG illimités</li>
              <li><Check size={14} color="#2e7d32" /> Usage personnel</li>
            </ul>
            <button
              type="button"
              className="cb-modal-choose-btn btn-vip"
              onClick={() => handleSubscribe('colorvip')}
              disabled={loadingPlan === 'colorvip'}
            >
              {loadingPlan === 'colorvip' ? 'Chargement…' : 'Choisir ColorVIP'}
            </button>
          </div>

          {/* VIP Pro */}
          <div className="cb-modal-plan-box is-pro">
            <span className="cb-modal-tag-pro">Licence commerciale</span>
            <div className="cb-modal-plan-head">
              <h3>ColorVIP Pro</h3>
              <div className="cb-modal-price">
                {interval === 'year' ? (
                  <>
                    <span className="cb-m-crossed">71,88 €</span>
                    <b>49,99 €</b> <small>/ an</small>
                  </>
                ) : (
                  <>
                    <b>5,99 €</b> <small>/ mois</small>
                  </>
                )}
              </div>
            </div>
            <ul className="cb-modal-list">
              <li><Check size={14} color="#2e7d32" /> SVG illimités</li>
              <li><Check size={14} color="#2e7d32" /> Vente produits physiques</li>
              <li><Check size={14} color="#2e7d32" /> Attestation PDF nominative</li>
            </ul>
            <button
              type="button"
              className="cb-modal-choose-btn btn-pro"
              onClick={() => handleSubscribe('colorvip_pro')}
              disabled={loadingPlan === 'colorvip_pro'}
            >
              {loadingPlan === 'colorvip_pro' ? 'Chargement…' : 'Choisir ColorVIP Pro'}
            </button>
          </div>
        </div>

        <p className="cb-modal-hint-note">
          Renouvellement automatique, résiliable à tout moment en 1 clic sans engagement.
          {interval === 'year' && ' * Les prix barrés correspondent à 12 mensualités au tarif mensuel.'}
        </p>

        <ProIdentityModal
          isOpen={isProIdentityModalOpen}
          onClose={() => setIsProIdentityModalOpen(false)}
          onConfirm={(officialName) => executeCheckout('colorvip_pro', officialName)}
          loading={Boolean(loadingPlan)}
        />
      </div>
    </div>
  );
}
