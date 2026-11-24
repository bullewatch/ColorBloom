import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

export default function GoogleAdBanner({
  slotType = 'sidebar',
  adClient = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || 'ca-pub-3406729061784263',
  adSlot = import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ID || '0000000000',
  label = 'Espace Publicitaire',
  className = '',
}) {
  const adRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    // Only attempt push once per mount and if adsbygoogle script is loaded
    if (!pushedRef.current && typeof window !== 'undefined') {
      try {
        if (window.adsbygoogle) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushedRef.current = true;
        }
      } catch (err) {
        // Silently catch ad blockers or double push errors
        console.debug('AdSense notice:', err);
      }
    }
  }, []);

  const isInterstitial = slotType === 'interstitial';

  return (
    <div
      className={`cb-google-ad-block cb-ad-${slotType} ${className}`}
      ref={adRef}
      role="complementary"
      aria-label={label}
    >
      <div className="cb-google-ad-badge">
        <span>{label}</span>
      </div>

      <div className="cb-google-ad-wrapper">
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: isInterstitial ? '300px' : '100%',
            height: isInterstitial ? '250px' : '100%',
            minHeight: isInterstitial ? '250px' : '400px',
            margin: '0 auto',
          }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={isInterstitial ? 'rectangle' : 'auto'}
          data-full-width-responsive={isInterstitial ? 'false' : 'true'}
        />

        {/* Fallback & visual frame (displayed before or behind ad unit) */}
        <div className="cb-ad-fallback-canvas" aria-hidden="true">
          <div className="cb-ad-fallback-center">
            <Sparkles size={24} className="cb-ad-sparkle" />
            <span className="cb-ad-tagline">Colorblop Annonce</span>
            <span className="cb-ad-subtext">Google AdSense</span>
          </div>
        </div>
      </div>
    </div>
  );
}
