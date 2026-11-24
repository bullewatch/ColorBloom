import React, { useState } from 'react';
import { X, ShieldAlert, Lock, ArrowRight, Store, UserCheck, Calendar } from 'lucide-react';

export function ProIdentityModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e) {
    if (e) e.preventDefault();
    setError('');

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim().toUpperCase();
    const cleanShop = shopName.trim();
    const cleanBirth = birthDate.trim();

    if (!cleanFirst || !cleanLast) {
      setError('Veuillez renseigner votre Prénom et votre Nom officiel.');
      return;
    }

    if (cleanFirst.length < 2 || cleanLast.length < 2) {
      setError('Le prénom et le nom doivent comporter au moins 2 caractères chacun.');
      return;
    }

    if (!cleanBirth) {
      setError('Veuillez renseigner votre date de naissance.');
      return;
    }

    const formattedCustomerName = `${cleanLast} ${cleanFirst}${cleanShop ? ` (${cleanShop})` : ''}`;

    onConfirm({
      firstName: cleanFirst,
      lastName: cleanLast,
      birthDate: cleanBirth,
      shopName: cleanShop,
      customerName: formattedCustomerName,
    });
  }

  const previewName = `${(lastName || 'NOM').trim().toUpperCase()} ${(firstName || 'Prénom').trim()}`;
  let formattedBirthPreview = '';
  if (birthDate) {
    try {
      const parts = birthDate.split('-');
      if (parts.length === 3) {
        formattedBirthPreview = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch {
      formattedBirthPreview = birthDate;
    }
  }
  const previewShop = shopName.trim() || 'Artisan / Créateur Indépendant (Vente directe & Ateliers)';

  return (
    <div className="modal cb-membership-modal-overlay" onClick={onClose} style={{ zIndex: 10002 }}>
      <div className="cb-membership-modal-card cb-pro-identity-card" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Fermer"><X /></button>

        <div className="cb-modal-vip-badge pro">
          <Lock size={16} />
          <span>Attestation Nominative — Licence Commerciale Pro</span>
        </div>

        <h2 style={{ margin: '10px 0 6px', fontSize: '22px' }}>
          Attribution de votre Licence Commerciale
        </h2>
        <p className="cb-modal-vip-sub" style={{ marginBottom: '14px' }}>
          Renseignez l'identité officielle et le nom de boutique auxquels sera rattaché votre certificat d'exploitation. Le prénom et le nom peuvent être différents de ceux utilisés pour le paiement bancaire.
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

          <div className="cb-pro-field" style={{ marginTop: '10px' }}>
            <label htmlFor="pro-birthdate" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={14} color="#8d6e63" />
              <span>Date de naissance du titulaire : *</span>
            </label>
            <input
              id="pro-birthdate"
              type="date"
              className="cb-pro-input"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
            />
            <span style={{ fontSize: '11px', color: '#795548', fontFamily: 'Patrick Hand, cursive' }}>
              Cette information permet d'identifier formellement le bénéficiaire légal de la licence, même si le paiement est effectué avec une autre carte ou par un tiers.
            </span>
          </div>

          <div className="cb-pro-field" style={{ marginTop: '10px' }}>
            <label htmlFor="pro-shopname" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Store size={14} color="#8d6e63" />
              <span>Nom de votre boutique, enseigne ou marque (facultatif) :</span>
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
              Recommandé pour justifier vos créations physiques sur Etsy, Shopify, salons ou marchés artisanaux.
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
            color: '#334155',
            marginTop: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>
              <UserCheck size={16} />
              <span>Aperçu de l'inscription sur le certificat :</span>
            </div>
            <div>• Titulaire officiel : <b>{previewName}</b> {formattedBirthPreview ? `(né(e) le ${formattedBirthPreview})` : ''}</div>
            <div>• Enseigne / Boutique : <b>{previewShop}</b></div>
          </div>

          <div className="cb-pro-warning-notice" style={{ marginTop: '12px' }}>
            <ShieldAlert size={18} color="#b71c1c" style={{ flexShrink: 0 }} />
            <span>
              <b>Garantie légale :</b> Ces données officielles sont inscrites de façon inviolable sur votre certificat de licence pour prouver vos droits de commercialisation de produits physiques finis.
            </span>
          </div>

          <div className="cb-pro-actions" style={{ marginTop: '14px' }}>
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
              disabled={loading || !firstName.trim() || !lastName.trim() || !birthDate}
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
