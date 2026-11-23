import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Lock, ArrowRight, Store, UserCheck } from 'lucide-react';

export function ProIdentityModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e) {
    if (e) e.preventDefault();
    setError('');

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim().toUpperCase();
    const cleanShop = shopName.trim();

    if (!cleanFirst || !cleanLast) {
      setError('Veuillez renseigner votre Prénom et votre Nom officiel.');
      return;
    }

    if (cleanFirst.length < 2 || cleanLast.length < 2) {
      setError('Le prénom et le nom doivent comporter au moins 2 caractères chacun.');
      return;
    }

    const formattedCustomerName = `${cleanLast} ${cleanFirst}${cleanShop ? ` (${cleanShop})` : ''}`;

    onConfirm({
      firstName: cleanFirst,
      lastName: cleanLast,
      shopName: cleanShop,
      customerName: formattedCustomerName,
    });
  }

  const previewName = `${(lastName || 'NOM').trim().toUpperCase()} ${(firstName || 'Prénom').trim()}`;
  const previewShop = shopName.trim() || 'Artisan / Créateur Indépendant';

  return (
    <div className="modal cb-membership-modal-overlay" onClick={onClose} style={{ zIndex: 10002 }}>
      <div className="cb-membership-modal-card cb-pro-identity-card" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Fermer"><X /></button>

        <div className="cb-modal-vip-badge pro">
          <Lock size={16} />
          <span>Homologation Officielle — Licence Commerciale Pro</span>
        </div>

        <h2 style={{ margin: '10px 0 6px', fontSize: '22px' }}>
          Attribution de votre Licence Commerciale
        </h2>
        <p className="cb-modal-vip-sub" style={{ marginBottom: '14px' }}>
          Avant de procéder au règlement sécurisé, veuillez renseigner l'identité officielle et le nom de boutique auxquels sera rattachée votre attestation légale :
        </p>

        {error && (
          <div className="cb-membership-error-banner" style={{ margin: '0 0 12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cb-pro-identity-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="cb-pro-field">
              <label htmlFor="pro-firstname">Prénom officiel : *</label>
              <input
                id="pro-firstname"
                type="text"
                className="cb-pro-input"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="ex: Jean"
                autoFocus
                required
              />
            </div>

            <div className="cb-pro-field">
              <label htmlFor="pro-lastname">Nom de famille : *</label>
              <input
                id="pro-lastname"
                type="text"
                className="cb-pro-input"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="ex: DUPONT"
                required
              />
            </div>
          </div>

          <div className="cb-pro-field">
            <label htmlFor="pro-shopname" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Store size={14} color="#8d6e63" />
              <span>Nom de votre boutique, atelier ou marque (facultatif) :</span>
            </label>
            <input
              id="pro-shopname"
              type="text"
              className="cb-pro-input"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="ex: Les Créas de Sophie, Atelier Bois & Couleurs..."
            />
            <span style={{ fontSize: '11px', color: '#795548', fontFamily: 'Patrick Hand, cursive' }}>
              Optionnel mais recommandé pour les boutiques Etsy, créateurs d'objets, ateliers ou salons artisanaux.
            </span>
          </div>

          {/* Aperçu du certificat */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '13px',
            fontFamily: 'Patrick Hand, cursive',
            color: '#334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>
              <UserCheck size={16} />
              <span>Aperçu de l'inscription sur le certificat :</span>
            </div>
            <div>• Titulaire officiel : <b>{previewName}</b></div>
            <div>• Enseigne commerciale : <b>{previewShop}</b></div>
          </div>

          <div className="cb-pro-warning-notice">
            <ShieldAlert size={18} color="#b71c1c" style={{ flexShrink: 0 }} />
            <span>
              <b>Mention légale :</b> Ces informations sont enregistrées de façon définitive au Registre Central des Licences Colorblop pour justifier vos droits de vente légale auprès de vos clients et des plateformes.
            </span>
          </div>

          <div className="cb-pro-actions">
            <button
              type="button"
              className="cb-btn-cancel-modal"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="cb-btn-confirm-pro"
              disabled={loading || !firstName.trim() || !lastName.trim()}
            >
              {loading ? (
                <span>Validation en cours…</span>
              ) : (
                <>
                  <span>Passer au paiement sécurisé</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
