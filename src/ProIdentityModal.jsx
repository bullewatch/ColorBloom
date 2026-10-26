import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

export function ProIdentityModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [name, setName] = useState('');
  const [nameConfirm, setNameConfirm] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e) {
    if (e) e.preventDefault();
    setError('');

    const n1 = name.trim();
    const n2 = nameConfirm.trim();

    if (!n1 || !n2) {
      setError('Veuillez renseigner votre Nom et Prénom dans les deux champs.');
      return;
    }

    if (!n1.includes(' ')) {
      setError('Veuillez renseigner à la fois votre NOM et votre Prénom (séparés par un espace).');
      return;
    }

    if (n1.toLowerCase() !== n2.toLowerCase()) {
      setError('Les deux saisies ne correspondent pas exactement. Veuillez vérifier l’orthographe.');
      return;
    }

    onConfirm(n1.toUpperCase());
  }

  return (
    <div className="modal cb-membership-modal-overlay" onClick={onClose} style={{ zIndex: 10002 }}>
      <div className="cb-membership-modal-card cb-pro-identity-card" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Fermer"><X /></button>

        <div className="cb-modal-vip-badge pro">
          <Lock size={16} />
          <span>Vérification d’Identité — Licence Commerciale Pro</span>
        </div>

        <h2 style={{ margin: '10px 0 6px', fontSize: '22px' }}>
          Titulaire Officiel de la Licence
        </h2>
        <p className="cb-modal-vip-sub" style={{ marginBottom: '14px' }}>
          Votre attestation légale sera émise au nom renseigné ci-dessous. Veuillez saisir et confirmer votre <b>NOM et Prénom</b> :
        </p>

        {error && (
          <div className="cb-membership-error-banner" style={{ margin: '0 0 12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cb-pro-identity-form">
          <div className="cb-pro-field">
            <label htmlFor="pro-name-1">NOM et Prénom du titulaire :</label>
            <input
              id="pro-name-1"
              type="text"
              className="cb-pro-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: DUPONT Jean"
              autoFocus
              required
            />
          </div>

          <div className="cb-pro-field">
            <label htmlFor="pro-name-2">Confirmez votre NOM et Prénom :</label>
            <input
              id="pro-name-2"
              type="text"
              className="cb-pro-input"
              value={nameConfirm}
              onChange={e => setNameConfirm(e.target.value)}
              placeholder="ex: DUPONT Jean"
              required
            />
          </div>

          <div className="cb-pro-warning-notice">
            <ShieldAlert size={18} color="#b71c1c" style={{ flexShrink: 0 }} />
            <span>
              <b>Attention :</b> Ce nom est définitif et ne pourra plus être modifié après validation, afin de prévenir toute usurpation ou génération de licences multiples.
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
              disabled={loading || !name.trim() || !nameConfirm.trim()}
            >
              {loading ? (
                <span>Validation en cours…</span>
              ) : (
                <>
                  <span>Valider et continuer</span>
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
