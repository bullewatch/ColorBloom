import React, { useState, useEffect } from 'react';
import { X, Sparkles, Shield, Crown } from 'lucide-react';
import GoogleAdBanner from './GoogleAdBanner';

export default function AdInterstitialModal({
  isOpen,
  onClose,
  onOpenMembership,
  lang = 'FR',
  t = {},
}) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      return;
    }

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle ESC key once countdown is finished
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && countdown === 0) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, countdown, onClose]);

  if (!isOpen) return null;

  const canSkip = countdown === 0;

  return (
    <div
      className="cb-ad-interstitial-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t.adSponsored || 'Annonce sponsorisée'}
    >
      <div className="cb-ad-interstitial-dialog">
        {/* Top Header Bar with Skip Button */}
        <div className="cb-ad-interstitial-header">
          <div className="cb-ad-sponsor-label">
            <span className="cb-ad-pill-badge">{t.adSponsored || 'Annonce sponsorisée'}</span>
          </div>

          <button
            type="button"
            className={`cb-ad-skip-btn ${canSkip ? 'ready' : 'waiting'}`}
            onClick={() => {
              if (canSkip) onClose();
            }}
            disabled={!canSkip}
            aria-label={canSkip ? (t.skipAd || 'Passer l’annonce') : `${t.skipAdIn || 'Passer dans'} ${countdown}s`}
          >
            {canSkip ? (
              <>
                <span>{t.skipAd || 'Passer l’annonce'}</span>
                <X size={16} />
              </>
            ) : (
              <span>
                {t.skipAdIn || 'Passer dans'} {countdown}s
              </span>
            )}
          </button>
        </div>

        {/* Ad Container Box */}
        <div className="cb-ad-interstitial-body">
          <GoogleAdBanner
            slotType="interstitial"
            label={t.adSlotLabel || 'Espace Publicitaire'}
          />
        </div>

        {/* Footer: VIP Upsell (zero ads in paid version) */}
        <div className="cb-ad-interstitial-footer">
          <div className="cb-ad-vip-note">
            <Crown size={15} className="cb-ad-crown-icon" />
            <span>{t.vipNoAds || 'Les membres VIP profitent d’un site 100% sans publicité.'}</span>
          </div>
          {onOpenMembership && (
            <button
              type="button"
              className="cb-ad-vip-btn"
              onClick={() => {
                onClose();
                onOpenMembership();
              }}
            >
              <Sparkles size={14} />
              <span>{t.upgradeVipBtn || 'Devenir VIP sans pub'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
