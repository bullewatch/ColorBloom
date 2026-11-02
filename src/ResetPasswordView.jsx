import React, { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { supabase } from './supabase';

export function ResetPasswordView({
  onNavigateToLogin,
  initialError = null,
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError || '');
  const [success, setSuccess] = useState(false);
  const [clipboardWarning, setClipboardWarning] = useState('');

  // Password validation criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  function blockClipboard(e) {
    e.preventDefault();
    setClipboardWarning('Pour votre sécurité, le copier/couper/coller est désactivé dans ces champs.');
    setTimeout(() => setClipboardWarning(''), 3500);
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setErrorMessage('');
    setClipboardWarning('');

    if (!hasMinLength) {
      setErrorMessage('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (!hasUppercase) {
      setErrorMessage('Le mot de passe doit comporter au moins une lettre majuscule.');
      return;
    }
    if (!hasNumber) {
      setErrorMessage('Le mot de passe doit comporter au moins un chiffre.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes('same_password') ||
          error.message?.toLowerCase().includes('should be different')
        ) {
          setErrorMessage('Le nouveau mot de passe doit être différent de votre ancien mot de passe.');
        } else if (
          error.message?.toLowerCase().includes('expired') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.status === 401 ||
          error.status === 403
        ) {
          setErrorMessage('Votre session de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.');
        } else {
          setErrorMessage(error.message || 'Impossible de mettre à jour le mot de passe.');
        }
        setBusy(false);
        return;
      }

      // Disconnect temporary recovery session to guarantee a clean normal login
      await supabase.auth.signOut();

      setSuccess(true);
      setBusy(false);
    } catch (err) {
      setErrorMessage('Une erreur est survenue lors de la réinitialisation. Veuillez réessayer.');
      setBusy(false);
    }
  }

  return (
    <section className="cb-reset-password-page profile cb-profile-box">
      <div className="cb-reset-card">
        <div className="cb-reset-icon-wrap">
          <KeyRound size={42} className="cb-reset-icon" />
        </div>

        <h1>Choisissez un nouveau mot de passe</h1>

        {success ? (
          <div className="cb-reset-success-box">
            <CheckCircle2 size={54} className="cb-success-check-icon" />
            <h3>Mot de passe modifié avec succès !</h3>
            <p>
              Votre nouveau mot de passe a été enregistré en toute sécurité.
              Vous pouvez maintenant vous connecter à votre compte Colorblop.
            </p>
            <button
              type="button"
              className="cb-btn-reset-login"
              onClick={onNavigateToLogin}
            >
              <span>Se connecter</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : initialError ? (
          <div className="cb-reset-error-state">
            <AlertCircle size={48} className="cb-error-alert-icon" />
            <p className="cb-reset-error-text">{initialError}</p>
            <p className="cb-reset-error-hint">
              Pour des raisons de sécurité, les liens de réinitialisation ont une durée de validité limitée et ne peuvent être utilisés qu'une seule fois.
            </p>
            <button
              type="button"
              className="cb-btn-reset-login"
              onClick={onNavigateToLogin}
            >
              <span>Demander un nouveau lien</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="cb-reset-form" noValidate>
            <p className="cb-reset-intro">
              Saisissez votre nouveau mot de passe ci-dessous pour sécuriser votre compte Colorblop.
            </p>

            {errorMessage && (
              <div className="cb-reset-error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {clipboardWarning && (
              <div className="cb-reset-warning-banner" role="status">
                <Lock size={16} />
                <span>{clipboardWarning}</span>
              </div>
            )}

            {/* Field: Nouveau mot de passe */}
            <div className="cb-reset-field">
              <label htmlFor="cb-new-password">Nouveau mot de passe</label>
              <div className="cb-reset-input-wrap">
                <input
                  id="cb-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  onPaste={blockClipboard}
                  placeholder="Minimum 8 caractères, majuscule et chiffre"
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  className="cb-reset-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Field: Confirmez votre mot de passe */}
            <div className="cb-reset-field">
              <label htmlFor="cb-confirm-password">Confirmez votre mot de passe</label>
              <div className="cb-reset-input-wrap">
                <input
                  id="cb-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  onPaste={blockClipboard}
                  placeholder="Confirmez votre mot de passe"
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  className="cb-reset-eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Checklist criteria */}
            <div className="cb-reset-criteria">
              <div className={`cb-criterion ${hasMinLength ? 'valid' : ''}`}>
                <span className="cb-crit-bullet">{hasMinLength ? '✓' : '•'}</span>
                <span>Au moins 8 caractères</span>
              </div>
              <div className={`cb-criterion ${hasUppercase ? 'valid' : ''}`}>
                <span className="cb-crit-bullet">{hasUppercase ? '✓' : '•'}</span>
                <span>Au moins 1 majuscule</span>
              </div>
              <div className={`cb-criterion ${hasNumber ? 'valid' : ''}`}>
                <span className="cb-crit-bullet">{hasNumber ? '✓' : '•'}</span>
                <span>Au moins 1 chiffre</span>
              </div>
              <div className={`cb-criterion ${passwordsMatch ? 'valid' : ''}`}>
                <span className="cb-crit-bullet">{passwordsMatch ? '✓' : '•'}</span>
                <span>Mots de passe identiques</span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="cb-btn-save-password"
              disabled={busy || !isFormValid}
            >
              <Lock size={18} />
              <span>{busy ? 'Enregistrement…' : 'Enregistrer mon nouveau mot de passe'}</span>
            </button>

            <button
              type="button"
              className="cb-btn-back-login"
              onClick={onNavigateToLogin}
              disabled={busy}
            >
              Retour à la page de connexion
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
