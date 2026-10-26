import React, { useState } from 'react';
import { Crown, Check, X, ShieldCheck, Sparkles, Lock, ArrowRight, FileText, ExternalLink } from 'lucide-react';
import { supabase } from './supabase';
import { ProIdentityModal } from './ProIdentityModal';

export function MembershipView({
  session,
  subscription,
  onOpenProfile,
  onOpenManageSubscription,
  lang = 'FR',
}) {
  const [interval, setInterval] = useState('year'); // 'month' ou 'year' (recommandé par défaut)
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProIdentityModalOpen, setIsProIdentityModalOpen] = useState(false);

  const currentPlan = subscription?.status === 'active' || subscription?.status === 'trialing'
    ? subscription?.plan_id
    : null;

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
      setErrorMsg(err.message || 'Une erreur est survenue lors de la redirection vers le paiement.');
      setLoadingPlan(null);
      setIsProIdentityModalOpen(false);
    }
  }

  function handleSubscribe(planId) {
    setErrorMsg('');

    if (!session?.user) {
      if (onOpenProfile) onOpenProfile();
      return;
    }

    if (currentPlan === planId) {
      if (onOpenManageSubscription) {
        onOpenManageSubscription();
      }
      return;
    }

    if (planId === 'colorvip_pro') {
      setIsProIdentityModalOpen(true);
      return;
    }

    executeCheckout(planId, null);
  }

  return (
    <section className="cb-membership-section">
      <div className="cb-membership-parchment">
        {/* Header de la page */}
        <div className="cb-membership-header">
          <div className="cb-membership-pill">
            <Crown size={16} />
            <span>Abonnements Officiels Colorblop</span>
          </div>
          <h1>Débloquez les fichiers vectoriels SVG</h1>
          <p className="cb-membership-subtitle">
            Téléchargez tous les dessins au format vectoriel natif, sans perte de qualité, idéal pour vos traceurs, découpes (Cricut, Silhouette) et créations.
          </p>

          {/* Toggle Mensuel / Annuel */}
          <div className="cb-billing-toggle-wrap">
            <span className={`cb-toggle-label ${interval === 'month' ? 'active' : ''}`}>
              Mensuel
            </span>

            <button
              type="button"
              className={`cb-billing-switch ${interval === 'year' ? 'is-year' : ''}`}
              onClick={() => setInterval(prev => prev === 'month' ? 'year' : 'month')}
              aria-label="Basculer entre mensuel et annuel"
            >
              <span className="cb-billing-switch-thumb" />
            </button>

            <span className={`cb-toggle-label ${interval === 'year' ? 'active' : ''}`}>
              Annuel
              <span className="cb-discount-tag">Économisez 30 %</span>
            </span>
          </div>

          <p className="cb-toggle-subtext">
            {interval === 'year'
              ? 'Tarif annuel avantageux avec 30 % d’économie par rapport à 12 mensualités.'
              : 'Formule mensuelle souple et sans engagement, résiliable à tout moment.'}
          </p>

          {errorMsg && (
            <div className="cb-membership-error-banner">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Grille des 2 formules */}
        <div className="cb-membership-grid">
          {/* CARTE 1 : ColorVIP */}
          <div className={`cb-plan-card ${currentPlan === 'colorvip' ? 'is-current' : ''}`}>
            {currentPlan === 'colorvip' && (
              <span className="cb-plan-badge current">Votre formule actuelle ✓</span>
            )}

            <div className="cb-plan-top">
              <h2 className="cb-plan-title">ColorVIP</h2>
              <p className="cb-plan-desc">Pour les passionnés de coloriage et d’artisanat personnel.</p>

              <div className="cb-plan-price-wrap">
                {interval === 'year' ? (
                  <>
                    <div className="cb-price-crossed-row">
                      <span className="cb-price-crossed">35,88 €</span>
                      <span className="cb-price-badge-save">Économisez 30 %</span>
                    </div>
                    <div className="cb-price-main">
                      <span className="cb-price-amount">24,99 €</span>
                      <span className="cb-price-period">/ an</span>
                    </div>
                    <div className="cb-price-monthly-equiv">
                      Soit environ <b>2,08 € / mois</b>
                    </div>
                    <div className="cb-price-billing-note">
                      * Le prix barré de 35,88 € correspond à 12 mensualités au tarif mensuel (2,99 € × 12).
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cb-price-main">
                      <span className="cb-price-amount">2,99 €</span>
                      <span className="cb-price-period">/ mois</span>
                    </div>
                    <div className="cb-price-billing-note">
                      Facturé chaque mois. Sans engagement, résiliable à tout moment.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="cb-plan-features">
              <b>Ce qui est inclus :</b>
              <ul>
                <li>
                  <Check className="cb-check-icon" />
                  <span><b>Téléchargements SVG vectoriels illimités</b></span>
                </li>
                <li>
                  <Check className="cb-check-icon" />
                  <span>Accès instantané à l’ensemble du catalogue</span>
                </li>
                <li>
                  <Check className="cb-check-icon" />
                  <span>Formats PNG & PDF haute résolution inclus</span>
                </li>
                <li>
                  <Check className="cb-check-icon" />
                  <span>Usage personnel uniquement</span>
                </li>
                <li className="cb-feature-disabled">
                  <X className="cb-cross-icon" />
                  <span>Aucune licence commerciale (revente interdite)</span>
                </li>
              </ul>
            </div>

            <div className="cb-plan-bottom">
              <button
                type="button"
                className={`cb-plan-btn ${currentPlan === 'colorvip' ? 'btn-current' : 'btn-vip'}`}
                onClick={() => handleSubscribe('colorvip')}
                disabled={loadingPlan === 'colorvip'}
              >
                {loadingPlan === 'colorvip' ? (
                  'Redirection Stripe…'
                ) : currentPlan === 'colorvip' ? (
                  'Gérer mon abonnement'
                ) : (
                  <>
                    <span>Choisir ColorVIP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <span className="cb-plan-terms-hint">
                {interval === 'year'
                  ? 'Facturation de 24,99 €/an. Renouvellement automatique. Résiliation en 1 clic.'
                  : 'Facturation de 2,99 €/mois. Renouvellement automatique. Résiliation en 1 clic.'}
              </span>
            </div>
          </div>

          {/* CARTE 2 : ColorVIP Pro */}
          <div className={`cb-plan-card is-pro ${currentPlan === 'colorvip_pro' ? 'is-current' : ''}`}>
            <span className="cb-plan-badge pro-star">
              <Sparkles size={13} /> Idéal Artisans & Créateurs
            </span>

            {currentPlan === 'colorvip_pro' && (
              <span className="cb-plan-badge current">Votre formule actuelle ✓</span>
            )}

            <div className="cb-plan-top">
              <h2 className="cb-plan-title">
                ColorVIP Pro
              </h2>
              <p className="cb-plan-desc">Pour les créateurs indépendants, artisans et petites entreprises.</p>

              <div className="cb-plan-price-wrap">
                {interval === 'year' ? (
                  <>
                    <div className="cb-price-crossed-row">
                      <span className="cb-price-crossed">71,88 €</span>
                      <span className="cb-price-badge-save">Économisez 30 %</span>
                    </div>
                    <div className="cb-price-main">
                      <span className="cb-price-amount">49,99 €</span>
                      <span className="cb-price-period">/ an</span>
                    </div>
                    <div className="cb-price-monthly-equiv">
                      Soit environ <b>4,16 € / mois</b>
                    </div>
                    <div className="cb-price-billing-note">
                      * Le prix barré de 71,88 € correspond à 12 mensualités au tarif mensuel (5,99 € × 12).
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cb-price-main">
                      <span className="cb-price-amount">5,99 €</span>
                      <span className="cb-price-period">/ mois</span>
                    </div>
                    <div className="cb-price-billing-note">
                      Facturé chaque mois. Sans engagement, résiliable à tout moment.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="cb-plan-features">
              <b>Tous les avantages ColorVIP, plus :</b>
              <ul>
                <li>
                  <Check className="cb-check-icon pro" />
                  <span><b>Téléchargements SVG vectoriels illimités</b></span>
                </li>
                <li>
                  <Check className="cb-check-icon pro" />
                  <span><b>Usage personnel ET commercial autorisé</b></span>
                </li>
                <li>
                  <Check className="cb-check-icon pro" />
                  <span><b>Vente de produits physiques autorisée</b> (t-shirts, mugs, papeterie, stickers, jusqu’à 5 000 unités/visuel)</span>
                </li>
                <li>
                  <Check className="cb-check-icon pro" />
                  <span><b>Attestation de licence nominative téléchargeable (PDF officiel)</b> avec numéro unique et dates de validité</span>
                </li>
                <li>
                  <Check className="cb-check-icon pro" />
                  <span>Formats PNG & PDF haute résolution inclus</span>
                </li>
              </ul>
            </div>

            <div className="cb-plan-bottom">
              <button
                type="button"
                className={`cb-plan-btn ${currentPlan === 'colorvip_pro' ? 'btn-current' : 'btn-pro'}`}
                onClick={() => handleSubscribe('colorvip_pro')}
                disabled={loadingPlan === 'colorvip_pro'}
              >
                {loadingPlan === 'colorvip_pro' ? (
                  'Redirection Stripe…'
                ) : currentPlan === 'colorvip_pro' ? (
                  'Gérer mon abonnement Pro'
                ) : (
                  <>
                    <span>Choisir ColorVIP Pro</span>
                    <Sparkles size={16} />
                  </>
                )}
              </button>
              <span className="cb-plan-terms-hint">
                {interval === 'year'
                  ? 'Facturation de 49,99 €/an. Renouvellement automatique. Résiliation en 1 clic.'
                  : 'Facturation de 5,99 €/mois. Renouvellement automatique. Résiliation en 1 clic.'}
              </span>
            </div>
          </div>
        </div>

        {/* Section Réassurance & Précisions Légales */}
        <div className="cb-membership-footer-info">
          <div className="cb-info-item">
            <ShieldCheck className="cb-info-icon" />
            <div>
              <b>Paiement sécurisé par Stripe Billing</b>
              <p>Stripe Managed Payments avec chiffrement bancaire de pointe. Cartes bancaires, Apple Pay, Google Pay acceptés.</p>
            </div>
          </div>

          <div className="cb-info-item">
            <FileText className="cb-info-icon" />
            <div>
              <b>Liberté totale et sans engagement</b>
              <p>Modifiez de formule ou résiliez à tout moment en 1 clic depuis votre espace membre. Vos droits restent valides jusqu’à la fin de la période payée.</p>
            </div>
          </div>

          <div className="cb-info-item">
            <Lock className="cb-info-icon" />
            <div>
              <b>Protection de la propriété intellectuelle</b>
              <p>La licence commerciale ColorVIP Pro autorise la vente de produits physiques finis. La revente ou redistribution des fichiers numériques sources SVG reste formellement interdite.</p>
            </div>
          </div>
        </div>

        <ProIdentityModal
          isOpen={isProIdentityModalOpen}
          onClose={() => setIsProIdentityModalOpen(false)}
          onConfirm={(officialName) => executeCheckout('colorvip_pro', officialName)}
          loading={Boolean(loadingPlan)}
        />
      </div>
    </section>
  );
}
