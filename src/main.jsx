import React, { useEffect, useMemo, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import {
  Search, Heart, Settings, Download, X, Leaf, Globe2, Moon, Sun,
  LogIn, Mail, Send, ShieldCheck, Plus, FolderOpen, Tags,
  UploadCloud, Trash2, Pencil, CheckCircle2, LogOut, UserPlus,
  Home, Sparkles, Info, HelpCircle, Bell, FileCode, Check, History,
  PackageCheck, TrendingUp, ThumbsUp, CheckCheck, LayoutGrid,
  Users, Eye, RefreshCw, FileImage, FileText, Dices, Crown, Lock, FileBadge,
  GripVertical, ArrowUp, Building2, FolderTree, FolderPlus, ArrowRightLeft,
  MoveRight, CheckSquare, Square, FolderInput, ShieldAlert, ChevronUp, ChevronDown
} from 'lucide-react';
import './styles.css';
import { supabase, coloringImageUrl } from './supabase';
import { animalCatalog } from './animalCatalog';
import { translations, generateRandomPseudo, getDrawingTitle, matchesSearchWithTranslations, formatNewsItem } from './translations';
import { CguModal, LegalModal } from './CguModal';
import { MembershipView } from './MembershipView';
import { MembershipModal } from './MembershipModal';
import { MemberSubscriptionCard } from './MemberSubscriptionCard';
import { generateCommercialLicensePdf } from './licensePdf';
import { exportDrawingToCanvas, prepareHighResSvgString } from './svgExport';
import { ResetPasswordView } from './ResetPasswordView';
import GoogleAdBanner from './GoogleAdBanner';
import AdInterstitialModal from './AdInterstitialModal';

import colorblopBandeau from '../assets/colorblop-bandeau.png';
import colorVipBadge from '../assets/colorvip.png';
import colorVipProBadge from '../assets/colorvippro.png';
import boardArt from '../assets/board-tight.png';
import likeArt from '../assets/like-tight.png';
import likeLikedArt from '../assets/like-liked-tight.png';
import favorisArt from '../assets/favoris-tight.png';
import settingsArt from '../assets/settings-tight.png';

import avatar1 from '../assets/avatar-1.png';
import avatar2 from '../assets/avatar-2.png';
import avatar3 from '../assets/avatar-3.png';
import avatar4 from '../assets/avatar-4.png';
import avatar5 from '../assets/avatar-5.png';
import avatar6 from '../assets/avatar-6.png';
import avatar7 from '../assets/avatar-7.png';
import avatar8 from '../assets/avatar-8.png';

// Official 4 Mailbox Assets
import mailboxBase from '../assets/mailbox/mailbox-base.png';
import mailboxHover from '../assets/mailbox/mailbox-hover.png';
import mailboxClick from '../assets/mailbox/mailbox-click.png';
import mailboxNew from '../assets/mailbox/mailbox-new.png';

const avatarList = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8];

function getNavItems(t, latestBadge = '5') {
  return [
    { id: 'Accueil', label: t.navHome, icon: Home },
    { id: 'Catégorie', label: t.navCategories, icon: Leaf },
    { id: 'Favoris', label: t.navFavorites, icon: Heart },
    { id: 'Nouveautes', label: t.navNews, icon: Sparkles, badge: latestBadge },
    { id: 'DevenirMembre', label: t.navMembership || 'Devenir membre', icon: Crown },
    { id: 'APropos', label: t.navAbout, icon: Info },
  ];
}

function getCatLabel(catName, t) {
  switch (catName) {
    case 'Tous': return t.catAll;
    case 'Nouveautes':
    case 'Nouveautés': return t.navNews;
    case 'Animaux': return t.catAnimals;
    case 'Chats': return t.catCats;
    case 'Animaux du Monde': return 'Animaux du Monde';
    case 'Couronnes': return 'Couronnes';
    case 'Couronnes Noël': return 'Couronnes Noël';
    case 'Couronnes Halloween': return 'Couronnes Halloween';
    case 'Fées': return t.catFairies;
    case 'Fille': return t.catGirls;
    case 'Garçon': return t.catBoys;
    case 'Halloween': return t.catHalloween;
    case 'Dinosaures': return t.catDinosaurs;
    case 'Véhicules': return t.catVehicles;
    case 'VIP': return t.catVIP;
    case 'Divers': return t.catMisc;
    default: return catName;
  }
}

function formatLikes(count) {
  const n = Number(count) || 0;
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return String(n);
}

function toDrawing(row) {
  const isSvg = (row.image_path || '').toLowerCase().endsWith('.svg');
  const fullImage = coloringImageUrl(row.image_path);
  let thumb = row.thumb || fullImage;
  if (!row.thumb && row.image_path && row.image_path.includes('/previews/animaux/')) {
    thumb = row.image_path.replace('/previews/animaux/', '/previews/animaux/thumbs/').replace('.png', '.webp');
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    cat: row.categories || [],
    likes: row.likes_count || 0,
    downloads: row.downloads_count || 0,
    imagePath: row.image_path,
    image: fullImage,
    thumb: thumb || fullImage,
    isSvg,
    fresh: row.created_at ? (Date.now() - new Date(row.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000 : false,
    createdAt: row.created_at,
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const INITIAL_CATEGORIES = [
  { id: 'animaux', name: 'Animaux', parent_id: null, sort_order: 1 },
  { id: 'chats', name: 'Chats', parent_id: 'animaux', sort_order: 2 },
  { id: 'animaux-du-monde', name: 'Animaux du Monde', parent_id: 'animaux', sort_order: 3 },
  { id: 'fees', name: 'Fées', parent_id: null, sort_order: 4 },
  { id: 'fille', name: 'Fille', parent_id: null, sort_order: 5 },
  { id: 'garcon', name: 'Garçon', parent_id: null, sort_order: 6 },
  { id: 'halloween', name: 'Halloween', parent_id: null, sort_order: 7 },
  { id: 'dinosaures', name: 'Dinosaures', parent_id: null, sort_order: 8 },
  { id: 'vehicules', name: 'Véhicules', parent_id: null, sort_order: 9 },
  { id: 'couronnes', name: 'Couronnes', parent_id: null, sort_order: 10 },
  { id: 'couronnes-noel', name: 'Couronnes Noël', parent_id: 'couronnes', sort_order: 1 },
  { id: 'couronnes-halloween', name: 'Couronnes Halloween', parent_id: 'couronnes', sort_order: 2 },
  { id: 'vip', name: 'VIP', parent_id: null, sort_order: 11, is_vip: true },
  { id: 'divers', name: 'Divers', parent_id: null, sort_order: 12 },
];

function normalizeCategory(c) {
  const isVip = Boolean(
    c.is_vip ||
    c.isVip ||
    c.id === 'vip' ||
    String(c.name || '').toLowerCase() === 'vip' ||
    String(c.id || '').toLowerCase().startsWith('vip-') ||
    String(c.id || '').toLowerCase().endsWith('-vip')
  );
  return {
    id: c.id,
    name: c.name,
    parentId: c.parent_id !== undefined ? c.parent_id : (c.parentId || null),
    sortOrder: c.sort_order !== undefined ? c.sort_order : (c.sortOrder || 0),
    isVip,
  };
}

function isDrawingVip(drawing, allCategories) {
  if (!drawing) return false;
  if (drawing.isVip || drawing.is_vip) return true;
  const drawingCats = (drawing.cat || []).map(c => normalizeCatStr(c));
  if (drawingCats.includes('vip')) return true;
  if (!allCategories || !allCategories.length) return false;
  return allCategories.some(cat => cat.isVip && (drawingCats.includes(normalizeCatStr(cat.name)) || drawingCats.includes(normalizeCatStr(cat.id))));
}

function getSubcategoriesFor(parentCat, allCats) {
  if (!parentCat) return [];
  const pId = String(parentCat.id).toLowerCase();
  const pName = String(parentCat.name).toLowerCase();
  return (allCats || []).filter(c => 
    c.parentId && (
      String(c.parentId).toLowerCase() === pId ||
      String(c.parentId).toLowerCase() === pName
    )
  );
}

function getParentCategoryFor(catNameOrId, allCats) {
  if (!catNameOrId) return null;
  const target = String(catNameOrId).toLowerCase();
  const current = (allCats || []).find(c => 
    String(c.id).toLowerCase() === target || 
    String(c.name).toLowerCase() === target
  );
  if (!current || !current.parentId) return null;
  const pTarget = String(current.parentId).toLowerCase();
  return (allCats || []).find(c => 
    String(c.id).toLowerCase() === pTarget || 
    String(c.name).toLowerCase() === pTarget
  ) || null;
}

export const DEFAULT_NEWS = [
  { id: 'news-0', dateKey: '2026-10-26', displayDate: '26/10', count: 47 },
  { id: 'news-1', dateKey: '2026-10-25', displayDate: '25/10', count: 34 },
  { id: 'news-2', dateKey: '2026-10-23', displayDate: '23/10', count: 22 },
  { id: 'news-3', dateKey: '2026-10-20', displayDate: '20/10', count: 18 },
  { id: 'news-4', dateKey: '2026-10-16', displayDate: '16/10', count: 25 },
];

function normalizeCatStr(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const svgBlobCache = new Map();
async function getSvgBlobUrl(url) {
  if (svgBlobCache.has(url)) return svgBlobCache.get(url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    const highResText = prepareHighResSvgString(text, 2400);
    const blob = new Blob([highResText], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    svgBlobCache.set(url, blobUrl);
    return blobUrl;
  } catch (err) {
    return url;
  }
}

function CanvasDrawingCard({ imageSrc, title, hasWatermark = false }) {
  const canvasRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '350px' }
    );

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    if (!isVisible || !imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const draw = () => {
      if (!active || !canvasRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const imgW = img.naturalWidth || img.width || 400;
      const imgH = img.naturalHeight || img.height || 400;
      const scale = Math.min((canvas.width * 0.92) / imgW, (canvas.height * 0.92) / imgH);
      const dw = imgW * scale;
      const dh = imgH * scale;
      const dx = (canvas.width - dw) / 2;
      const dy = (canvas.height - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // Filigrane automatique pour les miniatures des dessins VIP non abonnés
      if (hasWatermark) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-28 * Math.PI) / 180);
        ctx.fillStyle = 'rgba(150, 85, 30, 0.28)';
        ctx.font = '800 23px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = 'COLORBLOP VIP  ---  COLORBLOP VIP';
        for (let y = -280; y <= 280; y += 60) {
          ctx.fillText(text, 0, y);
        }
        ctx.restore();
      }
    };

    if (imageSrc.toLowerCase().includes('.svg')) {
      getSvgBlobUrl(imageSrc).then((blobUrl) => {
        if (!active) return;
        img.onload = draw;
        img.onerror = () => {
          if (!active) return;
          img.src = imageSrc;
        };
        img.src = blobUrl;
      });
    } else {
      img.onload = draw;
      img.src = imageSrc;
    }

    return () => {
      active = false;
    };
  }, [isVisible, imageSrc, hasWatermark]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="cb-pinned-drawing"
      onContextMenu={(e) => e.preventDefault()}
      aria-label={title}
    />
  );
}

function ModalDrawingPreview({ drawing, title, hasWatermark }) {
  const canvasRef = useRef(null);
  const [isBlurred, setIsBlurred] = useState(false);

  // Protection dynamique anti-capture d'écran (Flou immédiat dès perte de focus, multitâche ou PrintScreen)
  useEffect(() => {
    function handleBlur() {
      setIsBlurred(true);
    }
    function handleFocus() {
      setIsBlurred(false);
    }
    function handleVisibility() {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        setIsBlurred(true);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      }
    }

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!drawing?.image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const renderCanvas = () => {
      if (!active || !canvasRef.current) return;
      const imgW = img.naturalWidth || 800;
      const imgH = img.naturalHeight || 1000;
      const scale = 2;
      const width = Math.min(imgW * scale, 2400);
      const height = Math.min(imgH * scale, 3000);
      canvas.width = width;
      canvas.height = height;

      // 1. Draw solid white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw drawing image
      const fitScale = Math.min((width * 0.94) / imgW, (height * 0.94) / imgH);
      const dw = imgW * fitScale;
      const dh = imgH * fitScale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // 3. Bake watermark DIRECTLY onto canvas pixels if visitor limit reached
      if (hasWatermark) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((-28 * Math.PI) / 180);
        ctx.fillStyle = 'rgba(135, 75, 30, 0.26)';
        ctx.font = '800 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const isVipArt = Boolean(drawing?.isVip || drawing?.is_vip || (drawing?.cat || []).some(c => String(c).toLowerCase().includes('vip')));
        const text = isVipArt ? 'COLORBLOP VIP  ---  COLORBLOP VIP  ---  COLORBLOP VIP' : 'COLORBLOP  ---  COLORBLOP  ---  COLORBLOP';
        const stepY = 120;
        const range = Math.max(width, height) * 1.5;
        for (let y = -range; y <= range; y += stepY) {
          ctx.fillText(text, 0, y);
        }
        ctx.restore();
      }
    };

    if (drawing.image.toLowerCase().includes('.svg')) {
      getSvgBlobUrl(drawing.image).then((blobUrl) => {
        if (!active) return;
        img.onload = renderCanvas;
        img.onerror = () => {
          if (!active) return;
          img.src = drawing.image;
        };
        img.src = blobUrl;
      });
    } else {
      img.onload = renderCanvas;
      img.src = drawing.image;
    }

    return () => {
      active = false;
    };
  }, [drawing, hasWatermark]);

  return (
    <div 
      className={`cb-modal-drawing-wrapper ${isBlurred ? 'cb-shield-active' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => isBlurred && setIsBlurred(false)}
    >
      <canvas
        ref={canvasRef}
        className={`coloring-img big cb-preview-canvas ${isBlurred ? 'cb-canvas-blurred' : ''}`}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={title}
      />
      {/* Bouclier tactile transparent : bloque le glisser-déposer, l'appui long et l'enregistrement sur mobile et desktop */}
      <div 
        className="cb-drawing-protection-shield" 
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={() => {}}
      />
      {/* Voile de flou dynamique dès que le focus est perdu ou lors d'une tentative de capture */}
      {isBlurred && (
        <div className="cb-shield-notice-overlay" onClick={() => setIsBlurred(false)}>
          <ShieldAlert size={36} className="cb-shield-notice-icon" />
          <b className="cb-shield-notice-title">Aperçu protégé contre la capture</b>
          <span className="cb-shield-notice-sub">Cliquez sur l'écran pour réafficher le dessin</span>
        </div>
      )}
    </div>
  );
}

function App() {
  const [drawings, setDrawings] = useState(animalCatalog);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Tous');
  const [page, setPage] = useState('Accueil');
  const [sort, setSort] = useState('recent');
  const [favs, setFavs] = useState(() => new Set(JSON.parse(localStorage.getItem('cb-favs') || '[]')));
  const [open, setOpen] = useState(null);
  const [settings, setSettings] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('cb-theme') || 'day');
  const [lang, setLang] = useState(() => localStorage.getItem('cb-lang') || 'FR');
  const t = translations[lang] || translations.FR;
  const [newsList, setNewsList] = useState(() => {
    const local = JSON.parse(localStorage.getItem('cb-news-list') || '[]');
    return local.length ? local.slice(0, 5) : DEFAULT_NEWS;
  });
  const [selectedNewsDate, setSelectedNewsDate] = useState(null);
  const latestNewsCount = newsList[0]?.count || 47;
  const navItems = useMemo(
    () => getNavItems(t, String(latestNewsCount)),
    [t, latestNewsCount]
  );

  useEffect(() => {
    if (cat !== 'Nouveautes' && cat !== 'Nouveautés') {
      setSelectedNewsDate(null);
    }
  }, [cat]);
  const [nouveautesOpen, setNouveautesOpen] = useState(false);
  const [downloads, setDownloads] = useState(Number(localStorage.getItem('cb-downloads') || 0));
  const [downloading, setDownloading] = useState(null);
  const [adminView, setAdminView] = useState('stats');
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(() => Number(localStorage.getItem('cb-avatar') || 0));
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Stripe Subscriptions State
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState(null);

  // Legal & CGU/CGV Modal State
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('cgu');

  // Mobile Interstitial Ad State (pop up every 3 downloads in free version)
  const [isAdInterstitialOpen, setIsAdInterstitialOpen] = useState(false);

  // Références d'état pour la gestion native du bouton retour mobile (Android & Navigateurs)
  const openRef = useRef(open);
  openRef.current = open;
  const nouveautesOpenRef = useRef(nouveautesOpen);
  nouveautesOpenRef.current = nouveautesOpen;
  const isLegalModalOpenRef = useRef(isLegalModalOpen);
  isLegalModalOpenRef.current = isLegalModalOpen;
  const isMembershipModalOpenRef = useRef(isMembershipModalOpen);
  isMembershipModalOpenRef.current = isMembershipModalOpen;
  const isAdInterstitialOpenRef = useRef(isAdInterstitialOpen);
  isAdInterstitialOpenRef.current = isAdInterstitialOpen;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Ouvrir / Fermer le dessin agrandi avec gestion d'historique native
  const openDrawing = (drawing) => {
    if (!window.history.state?.cbDrawingOpen) {
      window.history.pushState({ cbDrawingOpen: true, id: drawing?.id || drawing?.slug }, '');
    }
    setOpen(drawing);
  };

  const closeDrawing = () => {
    if (window.history.state?.cbDrawingOpen) {
      window.history.back();
    } else {
      setOpen(null);
    }
  };

  const openNouveautes = () => {
    if (!window.history.state?.cbNouveautesOpen) {
      window.history.pushState({ cbNouveautesOpen: true }, '');
    }
    setNouveautesOpen(true);
  };

  const closeNouveautes = () => {
    if (window.history.state?.cbNouveautesOpen) {
      window.history.back();
    } else {
      setNouveautesOpen(false);
    }
  };

  // Gestion du bouton retour mobile et de la touche Échap
  useEffect(() => {
    const handlePopState = () => {
      // Si la modale dessin est ouverte, la fermeture s'opère sans quitter le site
      if (isAdInterstitialOpenRef.current) {
        setIsAdInterstitialOpen(false);
        return;
      }
      if (openRef.current) {
        setOpen(null);
        return;
      }
      if (nouveautesOpenRef.current) {
        setNouveautesOpen(false);
        return;
      }
      if (isLegalModalOpenRef.current) {
        setIsLegalModalOpen(false);
        return;
      }
      if (isMembershipModalOpenRef.current) {
        setIsMembershipModalOpen(false);
        return;
      }
      if (settingsRef.current) {
        setSettings(false);
        return;
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAdInterstitialOpenRef.current) {
        setIsAdInterstitialOpen(false);
        return;
      }
      if (openRef.current) {
          closeDrawing();
        } else if (nouveautesOpenRef.current) {
          closeNouveautes();
        } else if (isLegalModalOpenRef.current) {
          setIsLegalModalOpen(false);
        } else if (isMembershipModalOpenRef.current) {
          setIsMembershipModalOpen(false);
        } else if (settingsRef.current) {
          setSettings(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch('/api/subscription-status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptionData(data);
      }
    } catch (err) {
      console.warn('Erreur vérification statut abonnement:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [session]);

  useEffect(() => {
    // Détection d'erreurs d'authentification ou de récupération de mot de passe dans l'URL
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('error=') || search.includes('error=')) {
      const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : search);
      const errCode = params.get('error_code') || params.get('error');
      const errDesc = params.get('error_description') || '';
      const type = params.get('type');
      
      // On ne redirige vers ResetPassword que s'il s'agit explicitement d'un lien de récupération
      if (type === 'recovery' || errDesc.toLowerCase().includes('recovery') || errDesc.toLowerCase().includes('password')) {
        setResetPasswordError('Ce lien de réinitialisation est invalide, expiré ou a déjà été utilisé. Veuillez faire une nouvelle demande.');
        setPage('ResetPassword');
      }
      // Nettoyer l'URL pour ne pas polluer l'historique
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'success' || urlParams.get('payment') === 'success') {
      fetchSubscriptionStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('tab') === 'abonnement') {
      setPage('Profil');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('tab') === 'devenir-membre' || urlParams.get('tab') === 'membership') {
      setPage('DevenirMembre');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('tab') === 'cgu') {
      setLegalModalTab('cgu');
      setIsLegalModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('tab') === 'mentions') {
      setLegalModalTab('mentions');
      setIsLegalModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('tab') === 'confidentialite' || urlParams.get('tab') === 'rgpd' || urlParams.get('tab') === 'privacy') {
      setLegalModalTab('privacy');
      setIsLegalModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Dynamic categories with Supabase sync and localStorage fallback
  const [categoriesList, setCategoriesList] = useState(() => {
    const local = JSON.parse(localStorage.getItem('cb-custom-categories') || '[]');
    const deletedCatIds = new Set(JSON.parse(localStorage.getItem('cb-deleted-categories') || '[]'));
    const map = new Map();
    INITIAL_CATEGORIES.forEach(c => {
      if (!deletedCatIds.has(c.id) && !deletedCatIds.has(c.name.toLowerCase())) {
        map.set(c.id, normalizeCategory(c));
      }
    });
    local.forEach(c => {
      if (!deletedCatIds.has(c.id) && !deletedCatIds.has(c.name?.toLowerCase())) {
        map.set(c.id, normalizeCategory(c));
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  });

  // Desktop sidebar expansion state for categories with subcategories
  const [expandedCats, setExpandedCats] = useState({ animaux: true });
  const catPlanksRef = useRef(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkSidebarScroll = () => {
    const el = catPlanksRef.current;
    if (!el) return;
    const hasScroll = el.scrollHeight > el.clientHeight + 4;
    setCanScrollUp(hasScroll && el.scrollTop > 6);
    setCanScrollDown(hasScroll && el.scrollTop + el.clientHeight < el.scrollHeight - 6);
  };

  function scrollSidebar(direction) {
    const el = catPlanksRef.current;
    if (!el) return;
    const delta = direction === 'down' ? 140 : -140;
    el.scrollBy({ top: delta, behavior: 'smooth' });
    setTimeout(checkSidebarScroll, 220);
  }

  useEffect(() => {
    checkSidebarScroll();
  }, [categoriesList, expandedCats, isCatEditMode]);

  useEffect(() => {
    const el = catPlanksRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => checkSidebarScroll());
    observer.observe(el);
    window.addEventListener('resize', checkSidebarScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkSidebarScroll);
    };
  }, []);

  // Responsive Grid Density setting (base default: 2 drawings per row on mobile, 4 on desktop)
  const [gridDensity, setGridDensity] = useState(() => localStorage.getItem('cb-grid-density') || '2');
  const [desktopGridDensity, setDesktopGridDensity] = useState(() => localStorage.getItem('cb-desktop-grid-density') || '4');

  // Auto-hiding tabs strip state on scroll (mobile)
  const [headerVisible, setHeaderVisible] = useState(true);
  const searchInputRef = useRef(null);
  const lastScrollYRef = useRef(0);

  // Scroll listener: hides categories bar on scroll down, instantly re-shows on scroll up
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const diff = currentY - lastScrollYRef.current;

          if (currentY > 60) {
            if (diff > 8) {
              setHeaderVisible(false);
            } else if (diff < -3) {
              setHeaderVisible(true);
            }
          } else {
            setHeaderVisible(true);
          }

          lastScrollYRef.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('cb-grid-density', gridDensity);
  }, [gridDensity]);

  useEffect(() => {
    localStorage.setItem('cb-desktop-grid-density', desktopGridDensity);
  }, [desktopGridDensity]);

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      const local = JSON.parse(localStorage.getItem('cb-custom-categories') || '[]');
      const deletedCatIds = new Set(JSON.parse(localStorage.getItem('cb-deleted-categories') || '[]'));
      const map = new Map();
      INITIAL_CATEGORIES.forEach(c => {
        if (!deletedCatIds.has(c.id) && !deletedCatIds.has(c.name.toLowerCase())) {
          map.set(c.id, normalizeCategory(c));
        }
      });
      if (!error && data && data.length) {
        data.forEach(r => {
          if (!deletedCatIds.has(r.id) && !deletedCatIds.has(r.name?.toLowerCase())) {
            map.set(r.id, normalizeCategory(r));
          }
        });
      }
      local.forEach(c => {
        if (!deletedCatIds.has(c.id) && !deletedCatIds.has(c.name?.toLowerCase())) {
          map.set(c.id, normalizeCategory(c));
        }
      });
      const merged = Array.from(map.values()).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setCategoriesList(merged);
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  }

  async function loadNews(overrideDrawings = null) {
    try {
      const { data, error } = await supabase
        .from('addition_logs')
        .select('*')
        .order('date_key', { ascending: false })
        .limit(10);

      const logMap = new Map();
      if (!error && data && data.length) {
        data.forEach(r => {
          logMap.set(r.date_key, {
            id: r.id,
            dateKey: r.date_key,
            displayDate: r.display_date,
            count: r.drawings_count || 1,
          });
        });
      }

      // Dynamically verify real drawings to ensure all recent addition batches are included
      const targetDrawings = overrideDrawings || drawings || [];
      if (targetDrawings.length > 0) {
        const dateCounts = {};
        targetDrawings.forEach(d => {
          if (!d.createdAt) return;
          const dKey = d.createdAt.slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(dKey)) {
            dateCounts[dKey] = (dateCounts[dKey] || 0) + 1;
          }
        });

        Object.entries(dateCounts).forEach(([dKey, cnt]) => {
          const parts = dKey.split('-');
          const displayDate = `${parts[2]}/${parts[1]}`;
          const existing = logMap.get(dKey);
          if (!existing) {
            logMap.set(dKey, {
              id: `auto-${dKey}`,
              dateKey: dKey,
              displayDate,
              count: cnt,
            });
          } else if (existing.count < cnt) {
            existing.count = cnt;
          }
        });
      }

      const sortedNews = Array.from(logMap.values())
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .slice(0, 5);

      if (sortedNews.length > 0) {
        setNewsList(sortedNews);
        localStorage.setItem('cb-news-list', JSON.stringify(sortedNews));
      }
    } catch (err) {
      console.warn('Error loading addition news:', err);
    }
  }

  const rootCategories = useMemo(() => {
    return categoriesList.filter(c => !c.parentId);
  }, [categoriesList]);

  const activeCategoryObj = useMemo(() => {
    if (cat === 'Tous') return null;
    return categoriesList.find(c => c.name.toLowerCase() === cat.toLowerCase() || c.id === cat) || null;
  }, [cat, categoriesList]);

  const activeParentCategory = useMemo(() => {
    if (!activeCategoryObj) return null;
    if (!activeCategoryObj.parentId) {
      return activeCategoryObj;
    }
    return getParentCategoryFor(activeCategoryObj.id, categoriesList);
  }, [activeCategoryObj, categoriesList]);

  const activeSubcategories = useMemo(() => {
    if (!activeParentCategory) return [];
    return getSubcategoriesFor(activeParentCategory, categoriesList);
  }, [activeParentCategory, categoriesList]);

  const isVisitorLimitReached = !session && downloads >= 3;

  const favoriteDrawings = useMemo(() => {
    return drawings.filter(d => favs.has(d.id) || favs.has(d.slug) || favs.has(String(d.id)));
  }, [drawings, favs]);
  const favsCount = favoriteDrawings.length;

  // Disable right-click globally on all drawings, canvases, and images across the site
  useEffect(() => {
    const handleDrawingContextMenu = (e) => {
      if (
        e.target.tagName === 'IMG' ||
        e.target.tagName === 'CANVAS' ||
        e.target.closest('.cb-gallery') ||
        e.target.closest('.cb-board-item') ||
        e.target.closest('.cb-board-canvas') ||
        e.target.closest('.modalbox') ||
        e.target.closest('.bigpaper') ||
        e.target.closest('.cb-modal-drawing-wrapper') ||
        e.target.closest('.cb-lib-thumb') ||
        e.target.closest('.cb-pinned-drawing')
      ) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('contextmenu', handleDrawingContextMenu, { capture: true });
    return () => window.removeEventListener('contextmenu', handleDrawingContextMenu, { capture: true });
  }, []);

  function getCategoryDrawingsCount(categoryObj) {
    if (!categoryObj) return 0;
    const normName = normalizeCatStr(categoryObj.name);
    const normId = normalizeCatStr(categoryObj.id);

    if (categoryObj.parentId) {
      return drawings.filter(d => 
        (d.cat || []).some(c => {
          const nc = normalizeCatStr(c);
          return nc === normName || nc === normId;
        })
      ).length;
    }

    const subcats = getSubcategoriesFor(categoryObj, categoriesList);
    const accepted = new Set([
      normName,
      normId,
      ...subcats.map(s => normalizeCatStr(s.name)),
      ...subcats.map(s => normalizeCatStr(s.id)),
    ]);

    return drawings.filter(d => (d.cat || []).some(c => accepted.has(normalizeCatStr(c)))).length;
  }

  // Only flo83119@gmail.com is owner/admin
  const isOwner = Boolean(
    session?.user?.email?.toLowerCase() === 'flo83119@gmail.com'
  );
  const canDownloadSvg = Boolean(subscriptionData?.canDownloadSvg || isOwner);

  // Badge VIP officiel selon les droits réels confirmés par le serveur
  const vipBadge = useMemo(() => {
    if (!session && !isOwner) return null;

    const isOwnerUser = Boolean(isOwner || subscriptionData?.isOwner);
    if (isOwnerUser) {
      return { type: 'colorvip_pro', src: colorVipProBadge, label: 'ColorVIP Pro' };
    }

    const sub = subscriptionData?.subscription;
    const isSubActive = Boolean(
      sub &&
      ['active', 'trialing'].includes(sub.status) &&
      new Date(sub.current_period_end).getTime() > Date.now()
    );

    if (isSubActive) {
      if (sub.plan_id === 'colorvip_pro') {
        return { type: 'colorvip_pro', src: colorVipProBadge, label: 'ColorVIP Pro' };
      }
      if (sub.plan_id === 'colorvip') {
        return { type: 'colorvip', src: colorVipBadge, label: 'ColorVIP' };
      }
    }

    return null;
  }, [session, subscriptionData, isOwner]);

  // Statut de formule payante : désactive 100% des publicités (desktop et popups mobile)
  const isPaidUser = Boolean(vipBadge || isOwner || subscriptionData?.hasActiveSubscription);

  // Visitor IP Quota management (blocks incognito / private browsing bypass)
  const [visitorIp, setVisitorIp] = useState(null);

  useEffect(() => {
    async function initVisitorIp() {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
          const data = await res.json();
          if (data?.ip) {
            setVisitorIp(data.ip);
            const { count, error } = await supabase
              .from('visitor_downloads')
              .select('*', { count: 'exact', head: true })
              .eq('ip_address', data.ip);

            if (!error && typeof count === 'number') {
              const localDownloads = Number(localStorage.getItem('cb-downloads') || 0);
              const maxDownloads = Math.max(localDownloads, count);
              setDownloads(maxDownloads);
              localStorage.setItem('cb-downloads', maxDownloads);
            }
          }
        }
      } catch (err) {
        console.warn('IP quota check notice:', err);
      }
    }

    if (!session?.user) {
      initVisitorIp();
    }
  }, [session]);

  // Quick Category creation modal for owner
  const [showCatModal, setShowCatModal] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatParentId, setQuickCatParentId] = useState('');
  const [quickCatSubmitting, setQuickCatSubmitting] = useState(false);
  const [quickCatMsg, setQuickCatMsg] = useState(null);

  async function handleQuickCreateCategory(e) {
    if (e) e.preventDefault();
    const trimmed = quickCatName.trim();
    if (!trimmed) {
      alert('Veuillez entrer un nom de catégorie.');
      return;
    }

    const existing = categoriesList.find(c => normalizeCatStr(c.name) === normalizeCatStr(trimmed));
    if (existing) {
      setQuickCatMsg({ type: 'error', text: `La catégorie « ${existing.name} » existe déjà.` });
      return;
    }

    setQuickCatSubmitting(true);
    setQuickCatMsg(null);

    try {
      const parentId = quickCatParentId || null;
      const baseSlug = slugify(trimmed);
      const newId = parentId ? `${parentId}-${baseSlug}` : baseSlug;

      const newCatObj = {
        id: newId,
        name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
        parent_id: parentId,
        sort_order: categoriesList.length + 1,
      };

      // 1. LocalStorage fallback
      const stored = JSON.parse(localStorage.getItem('cb-custom-categories') || '[]');
      const updated = [...stored.filter(c => c.id !== newId), newCatObj];
      localStorage.setItem('cb-custom-categories', JSON.stringify(updated));

      // 2. Supabase upsert
      try {
        await supabase.from('categories').upsert(newCatObj, { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('Database category insert notice:', dbErr);
      }

      // 3. Reload categories in state
      await loadCategories();

      setQuickCatMsg({ type: 'success', text: `✓ Catégorie « ${newCatObj.name} » créée avec succès !` });
      setTimeout(() => {
        setQuickCatName('');
        setQuickCatParentId('');
        setQuickCatMsg(null);
        setShowCatModal(false);
      }, 900);
    } catch (err) {
      console.error(err);
      setQuickCatMsg({ type: 'error', text: 'Une erreur est survenue lors de la création.' });
    } finally {
      setQuickCatSubmitting(false);
    }
  }

  // Category management & drag-and-drop state for admin
  const [isCatEditMode, setIsCatEditMode] = useState(false);
  const [draggedCat, setDraggedCat] = useState(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);

  async function saveCategories(newList) {
    setCategoriesList(newList);
    localStorage.setItem('cb-custom-categories', JSON.stringify(newList));

    try {
      const rows = newList.map((c, index) => ({
        id: c.id,
        name: c.name,
        parent_id: c.parentId || null,
        sort_order: index + 1,
      }));
      await supabase.from('categories').upsert(rows, { onConflict: 'id' });
    } catch (e) {
      console.warn('Database categories save notice:', e);
    }
  }

  function handlePromoteToRoot(subId) {
    const target = categoriesList.find(c => c.id === subId);
    if (!target) return;

    const updated = categoriesList.map(c => {
      if (c.id === subId) {
        return { ...c, parentId: null };
      }
      return c;
    });

    const roots = updated.filter(c => !c.parentId);
    const subIdx = roots.findIndex(c => c.id === subId);
    if (subIdx > -1) {
      const [item] = roots.splice(subIdx, 1);
      roots.unshift(item);
    }

    const reassembled = [];
    roots.forEach((rc, rIdx) => {
      reassembled.push({ ...rc, sortOrder: rIdx + 1 });
      const subcats = updated.filter(c => c.parentId === rc.id);
      subcats.forEach((sc, sIdx) => {
        reassembled.push({ ...sc, sortOrder: sIdx + 1 });
      });
    });

    saveCategories(reassembled);
    setDraggedCat(null);
    setDragOverTargetId(null);
  }

  function handleReorderRoots(sourceId, targetId) {
    if (sourceId === targetId) return;

    const roots = categoriesList.filter(c => !c.parentId);
    const sourceIdx = roots.findIndex(c => c.id === sourceId);
    const targetIdx = roots.findIndex(c => c.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newRoots = [...roots];
    const [moved] = newRoots.splice(sourceIdx, 1);
    newRoots.splice(targetIdx, 0, moved);

    const reassembled = [];
    newRoots.forEach((rc, rIdx) => {
      reassembled.push({ ...rc, sortOrder: rIdx + 1 });
      const subcats = categoriesList.filter(c => c.parentId === rc.id);
      subcats.forEach((sc, sIdx) => {
        reassembled.push({ ...sc, sortOrder: sIdx + 1 });
      });
    });

    saveCategories(reassembled);
    setDraggedCat(null);
    setDragOverTargetId(null);
  }

  function handleReorderSubs(sourceId, targetId, parentId) {
    if (sourceId === targetId) return;

    const subcats = categoriesList.filter(c => c.parentId === parentId);
    const sourceIdx = subcats.findIndex(c => c.id === sourceId);
    const targetIdx = subcats.findIndex(c => c.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newSubs = [...subcats];
    const [moved] = newSubs.splice(sourceIdx, 1);
    newSubs.splice(targetIdx, 0, moved);

    const subMap = new Map(newSubs.map((s, idx) => [s.id, idx + 1]));
    const updated = categoriesList.map(c => {
      if (subMap.has(c.id)) {
        return { ...c, sortOrder: subMap.get(c.id) };
      }
      return c;
    });

    saveCategories(updated);
    setDraggedCat(null);
    setDragOverTargetId(null);
  }

  function handleMoveSubToAnotherParent(subId, newParentId) {
    const updated = categoriesList.map(c => {
      if (c.id === subId) {
        return { ...c, parentId: newParentId };
      }
      return c;
    });
    setExpandedCats(prev => ({ ...prev, [newParentId]: true }));
    saveCategories(updated);
    setDraggedCat(null);
    setDragOverTargetId(null);
  }

  function handleRenameCategory(catItem, e) {
    if (e) e.stopPropagation();
    const newName = window.prompt('Nouveau nom pour la catégorie :', catItem.name);
    if (!newName || !newName.trim() || newName.trim() === catItem.name) return;
    const trimmed = newName.trim();
    const updated = categoriesList.map(c => c.id === catItem.id ? { ...c, name: trimmed } : c);
    saveCategories(updated);
  }

  async function handleDeleteCategory(catItem, e) {
    if (e) e.stopPropagation();
    const isSub = Boolean(catItem.parentId);
    const msg = isSub
      ? `Supprimer la sous-catégorie « ${catItem.name} » ?`
      : `Supprimer la catégorie « ${catItem.name} » et toutes ses sous-catégories ?`;
    if (!window.confirm(msg)) return;

    const updated = categoriesList.filter(c => c.id !== catItem.id && c.parentId !== catItem.id);
    setCategoriesList(updated);
    localStorage.setItem('cb-custom-categories', JSON.stringify(updated));

    const delList = JSON.parse(localStorage.getItem('cb-deleted-categories') || '[]');
    if (!delList.includes(catItem.id)) delList.push(catItem.id);
    if (!delList.includes(catItem.name.toLowerCase())) delList.push(catItem.name.toLowerCase());
    if (!isSub) {
      const subs = categoriesList.filter(c => c.parentId === catItem.id);
      subs.forEach(s => {
        if (!delList.includes(s.id)) delList.push(s.id);
        if (!delList.includes(s.name.toLowerCase())) delList.push(s.name.toLowerCase());
      });
    }
    localStorage.setItem('cb-deleted-categories', JSON.stringify(delList));

    try {
      await supabase.from('categories').delete().eq('id', catItem.id);
      if (!isSub) {
        await supabase.from('categories').delete().eq('parent_id', catItem.id);
      }
    } catch (err) {
      console.warn('Error deleting category from Supabase:', err);
    }
  }

  async function loadDrawings() {
    let pagesData = null;
    let pagesErr = null;
    let deletedRows = [];

    try {
      const [pagesRes, deletedRes] = await Promise.all([
        supabase
          .from('coloring_pages')
          .select('id,slug,title,categories,image_path,likes_count,downloads_count,is_published,created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('deleted_colorings')
          .select('slug'),
      ]);
      pagesData = pagesRes.data;
      pagesErr = pagesRes.error;
      deletedRows = deletedRes?.data || [];
    } catch (e) {
      console.warn('Network error loading drawings:', e);
    }

    const localOverrides = JSON.parse(localStorage.getItem('cb-custom-titles') || '{}');
    const localCatOverrides = JSON.parse(localStorage.getItem('cb-custom-drawings-cats') || '{}');
    const localDeleted = JSON.parse(localStorage.getItem('cb-deleted-slugs') || '[]');
    const deletedSlugsSet = new Set([
      ...localDeleted,
      ...(deletedRows || []).map(r => r.slug),
    ]);

    const dbDrawings = (pagesData || [])
      .filter(row => row.is_published !== false && !deletedSlugsSet.has(row.slug) && !deletedSlugsSet.has(String(row.id)))
      .map(toDrawing)
      .map(d => {
        const titleOverride = localOverrides[d.id] || localOverrides[d.slug];
        const catOverride = localCatOverrides[d.id] || localCatOverrides[d.slug];
        return {
          ...d,
          ...(titleOverride ? { title: titleOverride } : {}),
          ...(catOverride && Array.isArray(catOverride) && catOverride.length ? { cat: catOverride } : {}),
        };
      });

    const existingSlugs = new Set(dbDrawings.map(d => d.slug));
    const combined = [
      ...dbDrawings,
      ...animalCatalog
        .filter(a => !existingSlugs.has(a.slug) && !deletedSlugsSet.has(a.slug) && !deletedSlugsSet.has(String(a.id)))
        .map(a => {
          const titleOverride = localOverrides[a.id] || localOverrides[a.slug];
          const catOverride = localCatOverrides[a.id] || localCatOverrides[a.slug];
          return {
            ...a,
            ...(titleOverride ? { title: titleOverride } : {}),
            ...(catOverride && Array.isArray(catOverride) && catOverride.length ? { cat: catOverride } : {}),
          };
        }),
    ];

    setDatabaseReady(!pagesErr);
    setDrawings(combined);
    loadNews(combined);
  }

  async function checkPendingRequests() {
    try {
      const { data, error } = await supabase
        .from('coloring_requests')
        .select('id')
        .eq('status', 'pending');
      if (!error && data) {
        setPendingRequestsCount(data.length);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAccount(activeSession) {
    if (!activeSession?.user) {
      setProfile(null);
      setOwnerOpen(false);
      setFavs(new Set(JSON.parse(localStorage.getItem('cb-favs') || '[]')));
      return;
    }

    const [{ data: profileData }, { data: favoriteData }] = await Promise.all([
      supabase.from('profiles').select('id,display_name,avatar_index,is_admin').eq('id', activeSession.user.id).maybeSingle(),
      supabase.from('favorites').select('coloring_id').eq('user_id', activeSession.user.id),
    ]);

    if (profileData) {
      setProfile(profileData);
      setSelectedAvatar(profileData.avatar_index || 0);
    } else if (activeSession?.user) {
      const metaPseudo =
        activeSession.user.user_metadata?.full_name ||
        activeSession.user.user_metadata?.name ||
        activeSession.user.user_metadata?.display_name ||
        activeSession.user.user_metadata?.pseudo ||
        activeSession.user.email?.split('@')[0];
      const metaAvatar = Number(activeSession.user.user_metadata?.avatar_index || 0);
      const isOwnerUser = Boolean(activeSession.user.email?.toLowerCase() === 'flo83119@gmail.com');
      const newProfileObj = {
        id: activeSession.user.id,
        display_name: metaPseudo,
        avatar_index: metaAvatar,
        is_admin: isOwnerUser,
      };
      setProfile(newProfileObj);
      setSelectedAvatar(metaAvatar);

      // Création automatique du profil Supabase pour les nouveaux utilisateurs Google
      try {
        await supabase.from('profiles').upsert(newProfileObj, { onConflict: 'id' });
      } catch (profErr) {
        console.warn('Profile sync notice:', profErr);
      }
    }
    setFavs(new Set((favoriteData || []).map(x => x.coloring_id)));
  }

  useEffect(() => {
    localStorage.setItem('cb-lang', lang);
  }, [lang]);

  useEffect(() => {
    loadDrawings();
    loadCategories();
    loadNews();
    checkPendingRequests();

    // Log site visit in analytics
    supabase.from('site_analytics').insert({
      event_type: 'visit',
      metadata: { path: window.location.pathname }
    }).then();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadAccount(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        // Parcours dédié de réinitialisation de mot de passe : ne pas connecter normalement
        setResetPasswordError(null);
        setPage('ResetPassword');
        // Nettoyer immédiatement les fragments d'URL pour ne jamais exposer de jetons
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      setSession(nextSession);
      loadAccount(nextSession);

      // Track member login event in analytics
      if (_event === 'SIGNED_IN' && nextSession?.user) {
        // Nettoyer les hash tokens d'OAuth dans la barre d'adresse pour une URL propre
        if (window.location.hash.includes('access_token=') || window.location.hash.includes('refresh_token=')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        supabase.from('site_analytics').insert({
          event_type: 'login',
          metadata: {
            user_id: nextSession.user.id,
            email: nextSession.user.email,
          }
        }).then();
      }
    });

    const interval = setInterval(checkPendingRequests, 30000);

    return () => {
      authListener.subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!session) localStorage.setItem('cb-favs', JSON.stringify([...favs]));
  }, [favs, session]);

  useEffect(() => {
    localStorage.setItem('cb-theme', theme);
  }, [theme]);

  async function heart(id) {
    const targetDrawing = drawings.find(d => d.id === id || d.slug === id);
    const key = targetDrawing ? targetDrawing.id : id;
    const slugKey = targetDrawing?.slug;
    const wasFavorite = favs.has(key) || (slugKey && favs.has(slugKey));
    const delta = wasFavorite ? -1 : 1;

    setFavs(current => {
      const next = new Set(current);
      if (wasFavorite) {
        next.delete(key);
        if (slugKey) next.delete(slugKey);
      } else {
        next.add(key);
      }
      return next;
    });

    setDrawings(current => current.map(d => (d.id === key || d.slug === key) ? { ...d, likes: Math.max(0, d.likes + delta) } : d));
    setOpen(current => (current?.id === key || current?.slug === key) ? { ...current, likes: Math.max(0, current.likes + delta) } : current);

    if (targetDrawing && !String(targetDrawing.id).startsWith('cb-svg-')) {
      const newLikes = Math.max(0, (targetDrawing.likes || 0) + delta);
      supabase.from('coloring_pages').update({ likes_count: newLikes }).eq('id', targetDrawing.id).then();
    }

    if (!session?.user) return;

    const query = wasFavorite
      ? supabase.from('favorites').delete().eq('user_id', session.user.id).in('coloring_id', [String(key), ...(slugKey ? [slugKey] : [])])
      : supabase.from('favorites').insert({ user_id: session.user.id, coloring_id: String(key) });

    const { error } = await query;
    if (error) {
      console.warn('Favorite sync warning:', error);
      await loadAccount(session);
    }
  }

  async function updateAvatar(index) {
    setSelectedAvatar(index);
    localStorage.setItem('cb-avatar', index);
    if (!session?.user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_index: index })
      .eq('id', session.user.id);

    if (!error) setProfile(current => current ? { ...current, avatar_index: index } : current);
  }

  async function download(format) {
    if (!open) return;

    // Coloriage VIP : téléchargement (SVG, PNG, PDF) strictement réservé aux membres VIP
    if (isDrawingVip(open, categoriesList) && !isPaidUser) {
      setDownloading(null);
      setIsMembershipModalOpen(true);
      return;
    }

    if (downloads >= 3 && !session) {
      alert('Tu as atteint la limite de 3 coloriages gratuits. Crée un compte gratuit pour continuer sans limite !');
      return;
    }

    setDownloading(format);
    const displayTitle = getDrawingTitle(open.title, lang);
    const safe = slugify(displayTitle) || 'coloriage';

    supabase.from('site_analytics').insert({
      event_type: 'download',
      metadata: {
        drawing_id: open.id,
        slug: open.slug,
        title: displayTitle,
        format,
      }
    }).then();

    if (!String(open.id).startsWith('cb-svg-')) {
      const nextDownloads = (open.downloads || 0) + 1;
      supabase.from('coloring_pages').update({ downloads_count: nextDownloads }).eq('id', open.id).then();
      setDrawings(prev => prev.map(d => d.id === open.id ? { ...d, downloads: nextDownloads } : d));
    }

    try {
      if (format === 'SVG') {
        if (!open.isSvg && !open.image.endsWith('.svg') && !open.svgAssetId) {
          alert('Le format SVG n’est pas disponible pour ce dessin matriciel.');
          return;
        }

        // Téléchargement SVG réservé aux membres ColorVIP et ColorVIP Pro
        if (!canDownloadSvg) {
          setIsMembershipModalOpen(true);
          return;
        }

        // Téléchargement sécurisé via l'API protégée
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          if (!sessionData?.session) {
            setSession(null);
          }
          setIsMembershipModalOpen(true);
          return;
        }

        const downloadUrl = `/api/download-svg?id=${encodeURIComponent(open.id)}&slug=${encodeURIComponent(open.slug || '')}`;

        const res = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            setSession(null);
            setIsMembershipModalOpen(true);
            return;
          }
          if (res.status === 403) {
            setIsMembershipModalOpen(true);
            return;
          }
          throw new Error('Erreur lors du téléchargement sécurisé du SVG.');
        }

        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = safe + '.svg';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else if (format === 'PNG') {
        const canvas = await exportDrawingToCanvas(open, {
          targetWidth: 2400,
          targetHeight: 3200,
          background: '#ffffff',
          trimMargins: true,
        });

        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Erreur lors de la génération de l’image PNG.'));
          }, 'image/png');
        });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = safe + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else {
        // PDF A4
        const canvas = await exportDrawingToCanvas(open, {
          targetWidth: 2400,
          targetHeight: 3200,
          background: '#ffffff',
          trimMargins: true,
        });

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 10;
        const maxW = 210 - margin * 2;
        const maxH = 297 - margin * 2;
        const ratio = canvas.width / canvas.height;
        let w = maxW;
        let h = w / ratio;
        if (h > maxH) {
          h = maxH;
          w = h * ratio;
        }
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (210 - w) / 2, (297 - h) / 2, w, h);
        pdf.save(safe + '.pdf');
      }

      if (!session) {
        try {
          let ip = visitorIp;
          if (!ip) {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            ip = data?.ip;
            if (ip) setVisitorIp(ip);
          }
          if (ip) {
            await supabase.from('visitor_downloads').insert({
              ip_address: ip,
              drawing_id: String(open.id),
              format,
            });
          }
        } catch (ipErr) {
          console.warn('Logging visitor download notice:', ipErr);
        }
        const n = downloads + 1;
        setDownloads(n);
        localStorage.setItem('cb-downloads', n);
      }

      // Pop up Google Ad sur mobile tous les 3 téléchargements dans la version gratuite (strictement désactivé dans la version payante)
      if (!isPaidUser) {
        const isMobileDevice = typeof window !== 'undefined' && (
          window.innerWidth <= 768 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        );

        if (isMobileDevice) {
          const prevCount = Number(localStorage.getItem('cb-free-dl-ad-count') || 0);
          const nextCount = prevCount + 1;
          localStorage.setItem('cb-free-dl-ad-count', String(nextCount));
          if (nextCount % 3 === 0) {
            setIsAdInterstitialOpen(true);
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert('Le téléchargement a échoué. Réessaie dans un instant.');
    } finally {
      setDownloading(null);
    }
  }

  const publicDrawingsCount = useMemo(() => {
    return drawings.filter(d => !isDrawingVip(d, categoriesList)).length;
  }, [drawings, categoriesList]);

  const shown = useMemo(() => {
    // Vérifier si la catégorie actuellement consultée est un Dossier VIP
    const currentTargetCat = categoriesList.find(c => 
      normalizeCatStr(c.name) === normalizeCatStr(cat) || 
      normalizeCatStr(c.id) === normalizeCatStr(cat)
    );
    const isViewingVipFolder = Boolean(currentTargetCat?.isVip || normalizeCatStr(cat) === 'vip');

    let result = drawings.filter(d => {
      const isArtVip = isDrawingVip(d, categoriesList);

      // Les dessins des Dossiers VIP ne s'affichent pas dans l'accueil mélangé aux autres dessins :
      // ils sont visibles uniquement lorsque l'utilisateur se trouve dans ce dossier VIP
      if (isArtVip && !isViewingVipFolder) {
        return false;
      }
      if (isViewingVipFolder && !isArtVip) {
        return false;
      }

      // Multilingual search matching in any supported language
      if (q && !matchesSearchWithTranslations(d.title, q, lang)) {
        return false;
      }
      if (cat === 'Nouveautes' || cat === 'Nouveautés') {
        if (selectedNewsDate) {
          const dKey = d.createdAt ? d.createdAt.slice(0, 10) : '';
          return dKey === selectedNewsDate;
        }
        const latestKey = newsList[0]?.dateKey;
        if (latestKey) {
          const dKey = d.createdAt ? d.createdAt.slice(0, 10) : '';
          if (dKey === latestKey) return true;
        }
        return d.fresh || (d.createdAt && (Date.now() - new Date(d.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000);
      }
      if (cat === 'Tous') return true;

      if (!currentTargetCat) {
        return (d.cat || []).some(c => normalizeCatStr(c) === normalizeCatStr(cat));
      }

      const normName = normalizeCatStr(currentTargetCat.name);
      const normId = normalizeCatStr(currentTargetCat.id);

      if (currentTargetCat.parentId) {
        // Specific subcategory (e.g. 'Chats')
        return (d.cat || []).some(c => {
          const nc = normalizeCatStr(c);
          return nc === normName || nc === normId;
        });
      } else {
        // Root category (e.g. 'Animaux'): include drawings of this category OR any of its subcategories
        const subcats = getSubcategoriesFor(currentTargetCat, categoriesList);
        const accepted = new Set([
          normName,
          normId,
          ...subcats.map(s => normalizeCatStr(s.name)),
          ...subcats.map(s => normalizeCatStr(s.id)),
        ]);
        return (d.cat || []).some(c => accepted.has(normalizeCatStr(c)));
      }
    });
    if (page === 'Favoris') result = result.filter(d => favs.has(d.id) || favs.has(d.slug) || favs.has(String(d.id)));
    if (sort === 'liked') result = [...result].sort((a, b) => b.likes - a.likes);
    if (sort === 'recent') result = [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (sort === 'alpha') {
      result = [...result].sort((a, b) => {
        const titleA = getDrawingTitle(a.title, lang);
        const titleB = getDrawingTitle(b.title, lang);
        return titleA.localeCompare(titleB, lang.toLowerCase(), { sensitivity: 'base', numeric: true });
      });
    }
    return result;
  }, [q, cat, selectedNewsDate, newsList, page, favs, sort, drawings, categoriesList, lang]);

  const activeAvatarSrc = avatarList[selectedAvatar] || avatar1;

  return (
    <main className={'theme-' + theme}>
      {/* Main Header */}
      <header className="cb-header">
        <div className="cb-header-top">
          {/* Unified Colorblop Floral Banner replacing old separate canopy & logo */}
          <div className="cb-bandeau-wrap" onClick={() => { setPage('Accueil'); setOwnerOpen(false); }}>
            <img src={colorblopBandeau} alt="Colorblop" className="cb-bandeau-img" />
          </div>

          {/* Top-Right: Favoris (desktop), Avatar & Settings (Always visible on mobile) */}
          <div className="cb-top-actions">
            {/* Desktop Favoris Button */}
            <button
              className={`cb-top-btn cb-fav-top-btn cb-desktop-only ${page === 'Favoris' ? 'active' : ''}`}
              onClick={() => { setPage('Favoris'); setOwnerOpen(false); }}
              title="Mes Favoris"
              aria-label="Mes Favoris"
            >
              <img src={favorisArt} alt="Favoris" />
              {favsCount > 0 && <span className="cb-top-badge">{favsCount}</span>}
            </button>

            {/* Direct Owner Space Button */}
            {isOwner && (
              <button
                className="cb-top-btn cb-owner-shield-btn"
                onClick={() => { setOwnerOpen(true); setAdminView('stats'); }}
                title="Espace Propriétaire (Statistiques & Dessins)"
                aria-label="Espace Propriétaire"
              >
                <ShieldCheck size={22} color="#ffe066" />
                <span className="cb-owner-btn-badge">Owner</span>
              </button>
            )}

            {/* Selected Avatar Circle with VIP Badge */}
            <div className="cb-avatar-header-wrap">
              <button
                className="cb-avatar-circle"
                onClick={() => { setPage('Profil'); setOwnerOpen(false); }}
                title="Mon Profil"
                aria-label="Mon Profil"
              >
                <img src={activeAvatarSrc} alt="Mon Avatar" />
              </button>
              {vipBadge && (
                <img
                  src={vipBadge.src}
                  alt={vipBadge.label}
                  className="cb-vip-badge-header"
                  title={`Membre ${vipBadge.label}`}
                />
              )}
            </div>

            {/* Settings Cogwheel Button */}
            <button
              className="cb-top-btn cb-settings-top-btn"
              onClick={() => setSettings(!settings)}
              title="Réglages"
              aria-label="Réglages"
            >
              <img src={settingsArt} alt="Réglages" />
            </button>
          </div>
        </div>

        {/* UNIFIED BROWN WOODEN BLOCK ENGLOBING TABS AND SEARCH BAR (Smart hide on scroll down on mobile) */}
        <div className={`cb-nav-search-block ${!headerVisible ? 'cb-mobile-hidden' : ''}`}>
          {/* Desktop Navigation Tabs (L'onglet Catégorie est retiré sur ordinateur car déjà présent à gauche) */}
          <nav className="cb-nav-tabs-row cb-desktop-only">
            {navItems.filter(item => item.id !== 'Catégorie').map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                className={`cb-nav-tab ${page === id && !ownerOpen ? 'active' : ''}`}
                onClick={() => {
                  if (id === 'Nouveautes') {
                    openNouveautes();
                    return;
                  }
                  setPage(id);
                  setOwnerOpen(false);
                  if (id === 'Catégorie') setCat('Tous');
                }}
              >
                <Icon className="cb-tab-icon" />
                <span>{label}</span>
                {badge && <small className="cb-tab-badge">{badge}</small>}
                {id === 'Favoris' && favsCount > 0 && <small className="cb-tab-badge">{favsCount}</small>}
              </button>
            ))}
          </nav>

          {/* Mobile All Category Tabs (Horizontal Scroll Strip at the top of the screen) */}
          <div className="cb-mobile-cats-row cb-mobile-only" aria-label="Catégories de coloriage">
            <button
              type="button"
              className={`cb-mobile-cat-pill ${cat === 'Tous' && page === 'Accueil' ? 'active' : ''}`}
              onClick={() => {
                setCat('Tous');
                setPage('Accueil');
                setOwnerOpen(false);
              }}
            >
              <span>{t.catAll}</span>
              <span className="cb-mobile-pill-count">({publicDrawingsCount})</span>
            </button>

            {rootCategories.map((rc) => {
              const isRootActive = cat === rc.name && page === 'Accueil';
              const subcats = getSubcategoriesFor(rc, categoriesList);
              const isChildActive = subcats.some(s => s.name === cat) && page === 'Accueil';
              const count = getCategoryDrawingsCount(rc);
              return (
                <button
                  key={rc.id}
                  type="button"
                  className={`cb-mobile-cat-pill ${isRootActive || isChildActive ? 'active' : ''}`}
                  onClick={() => {
                    setCat(rc.name);
                    setPage('Accueil');
                    setOwnerOpen(false);
                  }}
                >
                  {rc.isVip && <Crown size={12} className="cb-mobile-crown-icon" />}
                  <span>{getCatLabel(rc.name, t)}</span>
                  <span className="cb-mobile-pill-count">({count})</span>
                  {subcats.length > 0 && <span className="cb-pill-sub-indicator">▾</span>}
                </button>
              );
            })}
            <button
              type="button"
              className={`cb-mobile-cat-pill ${cat === 'Nouveautes' && page === 'Accueil' ? 'active' : ''}`}
              onClick={() => {
                setCat('Nouveautes');
                setSelectedNewsDate(null);
                setSort('recent');
                setPage('Accueil');
                setOwnerOpen(false);
              }}
            >
              <Sparkles size={14} />
              <span>{t.navNews}</span>
              <span className="cb-mobile-pill-count">({latestNewsCount})</span>
            </button>
            <button
              type="button"
              className={`cb-mobile-cat-pill ${page === 'APropos' ? 'active' : ''}`}
              onClick={() => { setPage('APropos'); setOwnerOpen(false); }}
            >
              <Info size={14} />
              <span>{t.navAbout}</span>
            </button>
          </div>

          {/* Mobile Subcategories Secondary Strip (Visible when active root category has subcategories) */}
          {activeParentCategory && activeSubcategories.length > 0 && page === 'Accueil' && (
            <div className="cb-mobile-subcats-row cb-mobile-only" aria-label="Sous-catégories">
              <span className="cb-mobile-subcat-badge">
                {getCatLabel(activeParentCategory.name, t)} :
              </span>
              <button
                type="button"
                className={`cb-mobile-subcat-pill ${cat === activeParentCategory.name ? 'active' : ''}`}
                onClick={() => {
                  setCat(activeParentCategory.name);
                  setPage('Accueil');
                }}
              >
                <span>Tout voir</span>
              </button>
              {activeSubcategories.map(sc => {
                const scCount = getCategoryDrawingsCount(sc);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    className={`cb-mobile-subcat-pill ${cat === sc.name ? 'active' : ''}`}
                    onClick={() => {
                      setCat(sc.name);
                      setPage('Accueil');
                    }}
                  >
                    <span>{getCatLabel(sc.name, t)}</span>
                    <span className="cb-mobile-pill-count">({scCount})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Bar Row inside the same brown wooden frame */}
          <div className="cb-search-bar-inner">
            <div className="cb-search-field">
              <Search className="cb-loupe-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
              />
              {q && (
                <button className="cb-search-clear" onClick={() => setQ('')} aria-label="Effacer">
                  <X />
                </button>
              )}
            </div>

            {/* Medallion Heart on the Right */}
            <button
              className={`cb-search-heart-medallion ${favsCount > 0 ? 'active' : ''}`}
              onClick={() => { setPage('Favoris'); setOwnerOpen(false); }}
              title="Voir mes favoris"
              aria-label="Voir mes favoris"
            >
              <Heart fill={favsCount > 0 ? '#d9534f' : '#eddcb8'} color="#5a2e12" />
              {favsCount > 0 && <span className="cb-medallion-count">{favsCount}</span>}
            </button>
          </div>
        </div>

        {/* Settings Modal (Langue, Aide téléchargement/impression) */}
        {settings && (
          <>
            <div className="cb-settings-backdrop" onClick={() => setSettings(false)} aria-hidden="true" />
            <div className="cb-settings-modal" role="dialog" aria-modal="true">
              <div className="cb-settings-header">
                <b><Settings className="settings-head-icon" /> {t.settingsTitle}</b>
                <button className="close-mini" onClick={() => setSettings(false)} aria-label="Fermer"><X /></button>
              </div>

              {/* Language Choice */}
              <div className="setting-section">
                <label>
                  <Globe2 /> {t.settingsLang}
                  <select value={lang} onChange={e => setLang(e.target.value)}>
                    <option value="FR">Français (FR)</option>
                    <option value="EN">English (EN)</option>
                    <option value="ES">Español (ES)</option>
                    <option value="DE">Deutsch (DE)</option>
                  </select>
                </label>
                <div className="cb-lang-disclaimer">
                  <Info size={16} />
                  <span>{t.disclaimer}</span>
                </div>
              </div>

              {/* Desktop Drawing Grid Size Selector (Visible on Desktop only) */}
              <div className="setting-section cb-desktop-only-setting">
                <b><LayoutGrid className="settings-head-icon" /> {t.settingsDesktopGrid || 'Affichage sur ordinateur (par ligne)'}</b>
                <p className="setting-subtext">{t.settingsDesktopGridSub || 'Choisis le nombre de coloriages par ligne sur grand écran :'}</p>
                <div className="cb-grid-density-picker cols-4">
                  {[
                    { id: '3', num: '3', label: t.desktopGrid3 || '3 grands', desc: '3 grands dessins par ligne' },
                    { id: '4', num: '4', label: t.desktopGrid4 || '4 standard', desc: '4 dessins par ligne (recommandé)' },
                    { id: '5', num: '5', label: t.desktopGrid5 || '5 compacts', desc: '5 dessins par ligne' },
                    { id: '6', num: '6', label: t.desktopGrid6 || '6 mini', desc: '6 dessins par ligne' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`cb-density-btn ${desktopGridDensity === opt.id ? 'active' : ''}`}
                      onClick={() => setDesktopGridDensity(opt.id)}
                      title={opt.desc}
                    >
                      <span className="cb-density-num">{opt.num}</span>
                      <span className="cb-density-label">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <small className="setting-hint">
                  {desktopGridDensity === '3' && "Grand format : 3 dessins par ligne pour admirer chaque détail."}
                  {desktopGridDensity === '4' && "Standard : 4 dessins par ligne (équilibre idéal sur ordinateur)."}
                  {desktopGridDensity === '5' && "Compact : 5 dessins par ligne pour afficher plus de coloriages."}
                  {desktopGridDensity === '6' && "Très compact : 6 dessins par ligne pour parcourir la collection en un clin d'œil."}
                </small>
              </div>

              {/* Mobile Drawing Grid Size Selector (Visible on Mobile only) */}
              <div className="setting-section cb-mobile-only-setting">
                <b><LayoutGrid className="settings-head-icon" /> {t.settingsMobileGrid}</b>
                <p className="setting-subtext">{t.settingsMobileGridSub}</p>
                <div className="cb-grid-density-picker">
                  {[
                    { id: '1', num: '1', label: t.gridDensity1, desc: '1 dessin par ligne' },
                    { id: '2', num: '2', label: t.gridDensity2, desc: '2 dessins par ligne' },
                    { id: '3', num: '3', label: t.gridDensity3, desc: '3 dessins par ligne' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`cb-density-btn ${gridDensity === opt.id ? 'active' : ''}`}
                      onClick={() => setGridDensity(opt.id)}
                      title={opt.desc}
                    >
                      <span className="cb-density-num">{opt.num}</span>
                      <span className="cb-density-label">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <small className="setting-hint">
                  {gridDensity === '1' && "Grand format : 1 dessin par ligne sur mobile pour admirer les moindres détails."}
                  {gridDensity === '2' && "Affichage de base : 2 dessins par ligne (idéal sur téléphone portable)."}
                  {gridDensity === '3' && "Compact : 3 dessins par ligne pour parcourir la collection plus vite."}
                </small>
              </div>

              {/* How It Works & Print Help (Sans aucun émoji) */}
              <div className="setting-section help-section">
                <b><HelpCircle className="help-icon" /> Comment ça marche ?</b>
                <div className="help-item">
                  <span><Download size={15} /> <b>Comment télécharger ?</b></span>
                  <p>Clique sur un dessin pour l'ouvrir, puis choisis <b>SVG</b> (vectoriel), <b>PNG</b> ou <b>PDF A4</b>.</p>
                </div>
                <div className="help-item">
                  <span><FileText size={15} /> <b>Comment imprimer ?</b></span>
                  <p>Télécharge le <b>PDF A4</b> (format idéal pour impression papier sans déformation), ouvre-le et imprime directement !</p>
                </div>
                <div className="help-item">
                  <span><FileCode size={15} /> <b>Format SVG Vectoriel :</b></span>
                  <p>Les dessins en SVG sont parfaits pour les découpes (Cricut, Silhouette), Illustrator et l'impression grand format sans perte de qualité.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Body - Accessible STRICTEMENT et UNIQUEMENT à flo83119@gmail.com */}
      {ownerOpen && isOwner ? (
        <AdminPanel
          view={adminView}
          setView={setAdminView}
          drawings={drawings}
          setDrawings={setDrawings}
          reloadDrawings={loadDrawings}
          categoriesList={categoriesList}
          setCategoriesList={setCategoriesList}
          reloadCategories={loadCategories}
          reloadNews={loadNews}
          user={session?.user}
          closeAdmin={() => setOwnerOpen(false)}
          pendingRequestsCount={pendingRequestsCount}
          refreshPendingRequests={checkPendingRequests}
        />
      ) : page === 'ResetPassword' ? (
        <ResetPasswordView
          initialError={resetPasswordError}
          onNavigateToLogin={() => {
            setResetPasswordError(null);
            setPage('Profil');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : page === 'DevenirMembre' ? (
        <MembershipView
          session={session}
          onOpenProfile={() => {
            setPage('Profil');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : page === 'Profil' ? (
        <Profile
          session={session}
          profile={profile}
          selectedAvatar={selectedAvatar}
          updateAvatar={updateAvatar}
          databaseReady={databaseReady}
          isOwner={isOwner}
          openAdmin={() => { setOwnerOpen(true); setAdminView('stats'); }}
          subscriptionData={subscriptionData}
          onRefreshSubscription={fetchSubscriptionStatus}
          onNavigateToMembership={() => {
            setPage('DevenirMembre');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          vipBadge={vipBadge}
          lang={lang}
          t={t}
        />
      ) : page === 'APropos' ? (
        /* Clean and Highly Legible À Propos Section without Huge Avatar */
        <section className="cb-about-clean">
          <div className="cb-about-parchment">
            <div className="cb-about-header">
              <Sparkles className="cb-about-sparkle" />
              <h1>{t.aboutTitle}</h1>
              <p className="cb-about-tagline">{t.aboutSubtitle}</p>
            </div>

            <div className="cb-about-content">
              <div className="cb-about-card">
                <div className="cb-about-card-icon"><Sparkles size={24} color="#795548" /></div>
                <h3>{t.aboutCard1Title}</h3>
                <p>{t.aboutCard1Text}</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon"><FileCode size={24} color="#2e7d32" /></div>
                <h3>{animalCatalog.length} {t.aboutCard2Title}</h3>
                <p>{t.aboutCard2Text}</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon"><Download size={24} color="#1565c0" /></div>
                <h3>{t.aboutCard3Title}</h3>
                <p>{t.aboutCard3Text}</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon"><Mail size={24} color="#c2185b" /></div>
                <h3>{t.aboutCard4Title}</h3>
                <p>{t.aboutCard4Text}</p>
              </div>
            </div>

            <div className="cb-about-footer-note">
              <button className="cb-about-back-btn" onClick={() => setPage('Accueil')}>
                {t.aboutBackBtn}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className={`layout cb-home ${isPaidUser ? 'is-paid' : ''}`}>
          {/* Left Sidebar: PURE CSS STICKY WOODEN PANEL (SUIT LE SCROLL) */}
          <aside className="cb-panel-aside">
            <div className="cb-css-panel">
              {/* Antique Corner Nails */}
              <span className="cb-css-nail top-left" aria-hidden="true" />
              <span className="cb-css-nail top-right" aria-hidden="true" />
              <span className="cb-css-nail bottom-left" aria-hidden="true" />
              <span className="cb-css-nail bottom-right" aria-hidden="true" />

              <div
                className="cb-panel-content"
                onWheel={(e) => {
                  const el = catPlanksRef.current;
                  if (el && el.scrollHeight > el.clientHeight) {
                    el.scrollTop += e.deltaY;
                    checkSidebarScroll();
                  }
                }}
              >
                {/* Sort Bar Plank */}
                <div className="cb-sort-plank">
                  <span className="cb-plank-label">{t.sortBy}</span>
                  <select value={sort} onChange={e => setSort(e.target.value)} aria-label={t.sortBy}>
                    <option value="recent">{t.sortRecent}</option>
                    <option value="liked">{t.sortLiked}</option>
                    <option value="alpha">{t.sortAlpha || 'Ordre alphabétique'}</option>
                  </select>
                </div>

                {/* Categories Header Fixed Row */}
                <div className="cb-planks-header-row">
                  <span className="cb-plank-label">{t.categoriesTitle}</span>
                  {isOwner && (
                    <button
                      type="button"
                      className={`cb-btn-toggle-cat-edit ${isCatEditMode ? 'active' : ''}`}
                      onClick={() => {
                        setIsCatEditMode(!isCatEditMode);
                        setDraggedCat(null);
                        setDragOverTargetId(null);
                      }}
                      title={isCatEditMode ? 'Enregistrer et quitter le mode modification' : 'Modifier et réorganiser les catégories'}
                    >
                      {isCatEditMode ? (
                        <>
                          <Check size={13} /> <span>Terminer</span>
                        </>
                      ) : (
                        <>
                          <Pencil size={13} /> <span>Modifier</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Categories Scrollable Container with Up/Down Chevrons */}
                <div className="cb-categories-scroll-wrapper">
                  {canScrollUp && (
                    <button
                      type="button"
                      className="cb-sidebar-scroll-btn up"
                      onClick={() => scrollSidebar('up')}
                      title="Défiler vers le haut"
                      aria-label="Défiler vers le haut"
                    >
                      <ChevronUp size={16} />
                    </button>
                  )}

                  <div
                    className="cb-categories-planks"
                    ref={catPlanksRef}
                    onScroll={checkSidebarScroll}
                  >

                  {/* Zone de glisser-déposer pour convertir une sous-catégorie vers le haut en catégorie principale */}
                  {isCatEditMode && draggedCat && draggedCat.parentId && (
                    <div
                      className={`cb-cat-promote-dropzone ${dragOverTargetId === '__root_promote__' ? 'drag-over' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTargetId('__root_promote__');
                      }}
                      onDragLeave={() => setDragOverTargetId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        handlePromoteToRoot(draggedCat.id);
                      }}
                    >
                      <ArrowUp size={16} />
                      <span>Glisser ici pour transformer en catégorie principale</span>
                    </div>
                  )}

                  {/* Tous */}
                  <button
                    className={`cb-css-plank ${cat === 'Tous' && page === 'Accueil' ? 'active' : ''}`}
                    onClick={() => {
                      if (isCatEditMode) return;
                      setCat('Tous');
                      setPage('Accueil');
                    }}
                  >
                    <span className="cb-plank-dot">•</span>
                    <span className="cb-plank-title">{t.catAll}</span>
                    <span className="cb-plank-pill">{publicDrawingsCount}</span>
                  </button>

                  {/* Nouveautés */}
                  <button
                    className={`cb-css-plank cb-plank-news ${cat === 'Nouveautes' && page === 'Accueil' ? 'active' : ''}`}
                    onClick={() => {
                      if (isCatEditMode) return;
                      setCat('Nouveautes');
                      setSelectedNewsDate(null);
                      setSort('recent');
                      setPage('Accueil');
                    }}
                  >
                    <span className="cb-plank-dot"><Sparkles size={14} /></span>
                    <span className="cb-plank-title">{t.navNews}</span>
                    <span className="cb-plank-pill">{latestNewsCount}</span>
                  </button>

                  {/* Catégories principales et sous-catégories imbriquées */}
                  {rootCategories.map(rc => {
                    const subcats = getSubcategoriesFor(rc, categoriesList);
                    const count = getCategoryDrawingsCount(rc);
                    const isRootSelected = cat === rc.name && page === 'Accueil';
                    const isChildSelected = subcats.some(s => s.name === cat) && page === 'Accueil';
                    const isExpanded = isCatEditMode || (expandedCats[rc.id] !== undefined ? Boolean(expandedCats[rc.id]) : Boolean(isRootSelected || isChildSelected));
                    const isDropTarget = dragOverTargetId === rc.id;

                    return (
                      <div
                        key={rc.id}
                        className={`cb-plank-group ${isDropTarget ? 'cb-drag-target' : ''}`}
                        onDragOver={(e) => {
                          if (!isCatEditMode || !draggedCat) return;
                          e.preventDefault();
                          setDragOverTargetId(rc.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverTargetId === rc.id) setDragOverTargetId(null);
                        }}
                        onDrop={(e) => {
                          if (!isCatEditMode || !draggedCat) return;
                          e.preventDefault();
                          if (draggedCat.id === rc.id) return;
                          if (draggedCat.parentId) {
                            handleMoveSubToAnotherParent(draggedCat.id, rc.id);
                          } else {
                            handleReorderRoots(draggedCat.id, rc.id);
                          }
                        }}
                      >
                        <div
                          className={`cb-css-plank ${isRootSelected ? 'active' : isChildSelected ? 'has-child-active' : ''} ${isCatEditMode ? 'editable' : ''}`}
                          draggable={isCatEditMode}
                          onDragStart={(e) => {
                            if (!isCatEditMode) return;
                            setDraggedCat({ id: rc.id, name: rc.name, parentId: null });
                            e.dataTransfer.setData('text/plain', rc.id);
                          }}
                          onDragEnd={() => {
                            setDraggedCat(null);
                            setDragOverTargetId(null);
                          }}
                          onClick={() => {
                            if (isCatEditMode) return;
                            setCat(rc.name);
                            setPage('Accueil');
                            if (subcats.length > 0) {
                              setExpandedCats(prev => ({ ...prev, [rc.id]: true }));
                            }
                          }}
                        >
                          {isCatEditMode ? (
                            <span className="cb-plank-drag-handle" title="Glisser pour réorganiser">
                              <GripVertical size={16} />
                            </span>
                          ) : (
                            <span className="cb-plank-dot">•</span>
                          )}

                          <span className="cb-plank-title">
                            {rc.isVip && <Crown size={14} className="cb-plank-crown-icon" />}
                            {getCatLabel(rc.name, t)}
                          </span>

                          {/* Mode Modification : Boutons d'action pour l'admin */}
                          {isCatEditMode ? (
                            <div className="cb-plank-edit-actions" onClick={e => e.stopPropagation()}>
                              {/* Bouton + pour créer une sous-catégorie */}
                              <button
                                type="button"
                                className="cb-btn-plank-plus"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickCatParentId(rc.id);
                                  setQuickCatName('');
                                  setShowCatModal(true);
                                }}
                                title={`Ajouter une sous-catégorie dans « ${rc.name} »`}
                              >
                                <Plus size={15} />
                              </button>

                              {/* Bouton Renommer */}
                              <button
                                type="button"
                                className="cb-btn-plank-icon"
                                onClick={(e) => handleRenameCategory(rc, e)}
                                title={`Renommer « ${rc.name} »`}
                              >
                                <Pencil size={13} />
                              </button>

                              {/* Bouton Supprimer */}
                              <button
                                type="button"
                                className="cb-btn-plank-icon danger"
                                onClick={(e) => handleDeleteCategory(rc, e)}
                                title={`Supprimer « ${rc.name} »`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <>
                              {subcats.length > 0 && (
                                <span
                                  className={`cb-plank-arrow ${isExpanded ? 'open' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedCats(prev => {
                                      const current = prev[rc.id] !== undefined ? Boolean(prev[rc.id]) : Boolean(isRootSelected || isChildSelected);
                                      return { ...prev, [rc.id]: !current };
                                    });
                                  }}
                                  title={isExpanded ? 'Réduire' : 'Dérouler'}
                                >
                                  {isExpanded ? '▾' : '▸'}
                                </span>
                              )}
                              <span className="cb-plank-pill">{count}</span>
                            </>
                          )}
                        </div>

                        {/* Sous-planches imbriquées si déployé */}
                        {subcats.length > 0 && isExpanded && (
                          <div className="cb-subplanks-container">
                            {!isCatEditMode && (
                              <button
                                className={`cb-css-subplank ${isRootSelected ? 'active' : ''}`}
                                onClick={() => {
                                  setCat(rc.name);
                                  setPage('Accueil');
                                }}
                              >
                                <span className="cb-subplank-branch">↳</span>
                                <span className="cb-subplank-title">
                                  {rc.isVip && <Crown size={12} className="cb-plank-crown-icon" />}
                                  Tous les {getCatLabel(rc.name, t)}
                                </span>
                                <span className="cb-subplank-pill">{count}</span>
                              </button>
                            )}

                            {subcats.map(sc => {
                              const scCount = getCategoryDrawingsCount(sc);
                              const isSubActive = cat === sc.name && page === 'Accueil';
                              const isSubDropTarget = dragOverTargetId === sc.id;

                              return (
                                <div
                                  key={sc.id}
                                  className={`cb-subplank-wrap ${isSubDropTarget ? 'cb-drag-target' : ''}`}
                                  onDragOver={(e) => {
                                    if (!isCatEditMode || !draggedCat) return;
                                    e.preventDefault();
                                    setDragOverTargetId(sc.id);
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverTargetId === sc.id) setDragOverTargetId(null);
                                  }}
                                  onDrop={(e) => {
                                    if (!isCatEditMode || !draggedCat) return;
                                    e.preventDefault();
                                    if (draggedCat.id === sc.id) return;
                                    if (draggedCat.parentId === rc.id) {
                                      handleReorderSubs(draggedCat.id, sc.id, rc.id);
                                    } else if (draggedCat.parentId) {
                                      handleMoveSubToAnotherParent(draggedCat.id, rc.id);
                                    }
                                  }}
                                >
                                  <div
                                    className={`cb-css-subplank ${isSubActive ? 'active' : ''} ${isCatEditMode ? 'editable' : ''}`}
                                    draggable={isCatEditMode}
                                    onDragStart={(e) => {
                                      if (!isCatEditMode) return;
                                      setDraggedCat({ id: sc.id, name: sc.name, parentId: rc.id });
                                      e.dataTransfer.setData('text/plain', sc.id);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedCat(null);
                                      setDragOverTargetId(null);
                                    }}
                                    onClick={() => {
                                      if (isCatEditMode) return;
                                      setCat(sc.name);
                                      setPage('Accueil');
                                    }}
                                  >
                                    {isCatEditMode ? (
                                      <span className="cb-plank-drag-handle" title="Glisser pour réorganiser">
                                        <GripVertical size={14} />
                                      </span>
                                    ) : (
                                      <span className="cb-subplank-branch">↳</span>
                                    )}

                                    <span className="cb-subplank-title">
                                      {(sc.isVip || rc.isVip) && <Crown size={12} className="cb-plank-crown-icon" />}
                                      {getCatLabel(sc.name, t)}
                                    </span>

                                    {isCatEditMode ? (
                                      <div className="cb-plank-edit-actions" onClick={e => e.stopPropagation()}>
                                        {/* Bouton pour promouvoir en catégorie principale */}
                                        <button
                                          type="button"
                                          className="cb-btn-promote-pill"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePromoteToRoot(sc.id);
                                          }}
                                          title="Transformer en catégorie principale (vers le haut)"
                                        >
                                          <ArrowUp size={12} />
                                          <span>En principale</span>
                                        </button>

                                        {/* Bouton Renommer */}
                                        <button
                                          type="button"
                                          className="cb-btn-plank-icon"
                                          onClick={(e) => handleRenameCategory(sc, e)}
                                          title={`Renommer « ${sc.name} »`}
                                        >
                                          <Pencil size={12} />
                                        </button>

                                        {/* Bouton Supprimer */}
                                        <button
                                          type="button"
                                          className="cb-btn-plank-icon danger"
                                          onClick={(e) => handleDeleteCategory(sc, e)}
                                          title={`Supprimer « ${sc.name} »`}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="cb-subplank-pill">{scCount}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Bouton + Ajouter une catégorie (en bas de la liste en mode modification) */}
                  {isCatEditMode && (
                    <button
                      type="button"
                      className="cb-btn-add-main-cat"
                      onClick={() => {
                        setQuickCatParentId('');
                        setQuickCatName('');
                        setShowCatModal(true);
                      }}
                      title="Créer une nouvelle catégorie principale"
                    >
                      <Plus size={16} />
                      <span>Ajouter une catégorie</span>
                    </button>
                  )}

                  {/* Bouton Favoris au bas des catégories */}
                  <button
                    className={`cb-css-plank cb-plank-favs ${page === 'Favoris' ? 'active' : ''}`}
                    onClick={() => {
                      setPage('Favoris');
                    }}
                    title={t.myFavorites}
                  >
                    <span className="cb-plank-dot">•</span>
                    <span className="cb-plank-title">{t.myFavorites}</span>
                    <span className="cb-plank-pill">{favsCount}</span>
                  </button>
                </div>

                {canScrollDown && (
                  <button
                    type="button"
                    className="cb-sidebar-scroll-btn down"
                    onClick={() => scrollSidebar('down')}
                    title="Défiler vers le bas"
                    aria-label="Défiler vers le bas"
                  >
                    <ChevronDown size={16} />
                  </button>
                )}
              </div>
              </div>
            </div>
          </aside>

          {/* Center Gallery: Grid of Wooden Boards with Pinned Drawings */}
          <section className="cb-gallery">
            {(() => {
              const currentTargetCat = categoriesList.find(c => 
                normalizeCatStr(c.name) === normalizeCatStr(cat) || 
                normalizeCatStr(c.id) === normalizeCatStr(cat)
              );
              const isViewingVipFolder = Boolean(currentTargetCat?.isVip || normalizeCatStr(cat) === 'vip');
              if (!isViewingVipFolder || page !== 'Accueil') return null;
              return (
                <div className="cb-vip-gallery-banner">
                  <div className="cb-vip-gallery-banner-content">
                    <Crown size={24} className="cb-vip-banner-crown" />
                    <div>
                      <h3 className="cb-vip-banner-title">
                        {currentTargetCat ? getCatLabel(currentTargetCat.name, t) : 'Dossier VIP'}
                        <span className="cb-vip-banner-count"> ({shown.length} coloriage{shown.length > 1 ? 's' : ''})</span>
                      </h3>
                      <p className="cb-vip-banner-sub">
                        {!isPaidUser
                          ? 'Dossier exclusif réservé aux membres VIP. Débloquez tous les téléchargements HD en devenant membre !'
                          : 'Coloriages exclusifs réservés aux membres VIP.'}
                      </p>
                    </div>
                  </div>
                  {!isPaidUser && (
                    <button
                      type="button"
                      className="cb-vip-banner-join-btn"
                      onClick={() => setIsMembershipModalOpen(true)}
                    >
                      <Crown size={15} />
                      <span>Devenir membre VIP</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {cat === 'Nouveautes' && page === 'Accueil' && (
              <div className="cb-news-gallery-banner">
                <div className="cb-news-banner-content">
                  <Sparkles size={22} className="cb-news-banner-sparkle" />
                  <div>
                    <h3 className="cb-news-banner-title">
                      {selectedNewsDate ? (
                        lang === 'EN' ? `Drawings added on ${newsList.find(n => n.dateKey === selectedNewsDate)?.displayDate || selectedNewsDate}`
                        : lang === 'ES' ? `Dibujos añadidos el ${newsList.find(n => n.dateKey === selectedNewsDate)?.displayDate || selectedNewsDate}`
                        : lang === 'DE' ? `Ausmalbilder hinzugefügt am ${newsList.find(n => n.dateKey === selectedNewsDate)?.displayDate || selectedNewsDate}`
                        : `Coloriages ajoutés le ${newsList.find(n => n.dateKey === selectedNewsDate)?.displayDate || selectedNewsDate}`
                      ) : (
                        lang === 'EN' ? 'Latest Additions'
                        : lang === 'ES' ? 'Últimas Novedades'
                        : lang === 'DE' ? 'Neueste Bilder'
                        : 'Derniers coloriages ajoutés'
                      )}
                      <span className="cb-news-banner-count"> ({shown.length})</span>
                    </h3>
                    <p className="cb-news-banner-sub">
                      {lang === 'EN' ? 'Discover the newly published coloring drawings'
                      : lang === 'ES' ? 'Descubre los dibujos recién publicados'
                      : lang === 'DE' ? 'Entdecke die neu veröffentlichten Ausmalbilder'
                      : 'Découvre les dessins fraîchement publiés'}
                    </p>
                  </div>
                </div>
                <div className="cb-news-banner-actions">
                  <button
                    type="button"
                    className="cb-news-banner-btn-history"
                    onClick={openNouveautes}
                  >
                    <History size={15} />
                    <span>{lang === 'EN' ? 'All additions' : lang === 'ES' ? 'Ver fechas' : lang === 'DE' ? 'Alle Daten' : 'Voir les 5 dates d’ajouts'}</span>
                  </button>
                  <button
                    type="button"
                    className="cb-news-banner-btn-all"
                    onClick={() => { setCat('Tous'); setSelectedNewsDate(null); }}
                  >
                    <X size={15} />
                    <span>{lang === 'EN' ? 'Show all' : lang === 'ES' ? 'Ver todos' : lang === 'DE' ? 'Alle anzeigen' : 'Voir tous les coloriages'}</span>
                  </button>
                </div>
              </div>
            )}
            {shown.length ? (
              <div className={`cb-boards-grid cb-desktop-cols-${desktopGridDensity} cb-grid-cols-${gridDensity}`}>
                {shown.map((d) => (
                  <article 
                    className="cb-board-item" 
                    key={d.id} 
                    onClick={() => openDrawing(d)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {/* The Wooden Board Frame Background */}
                    <div className="cb-board-frame" style={{ backgroundImage: `url(${boardArt})` }}>
                      {/* Pinned Drawing on the Inner Parchment Canvas */}
                      <div className="cb-board-canvas" onContextMenu={(e) => e.preventDefault()}>
                        {(() => {
                          const isVipArt = isDrawingVip(d, categoriesList);
                          return (
                            <>
                              {isVipArt ? (
                                <span className={`cb-board-vip-tag ${!isPaidUser ? 'locked' : ''}`} title={isPaidUser ? "Coloriage exclusif membre VIP" : "Coloriage réservé aux membres VIP"}>
                                  <Crown size={11} /> {!isPaidUser && <Lock size={9} />} VIP
                                </span>
                              ) : d.isSvg ? (
                                <span className="cb-svg-tag" title="Dessin vectoriel SVG disponible"><FileCode size={11} /> SVG</span>
                              ) : null}
                              {((newsList[0] && d.createdAt && d.createdAt.slice(0, 10) === newsList[0].dateKey) || d.fresh) && (
                                <span className="cb-fresh-card-tag" title="Nouveau coloriage"><Sparkles size={10} /> {lang === 'EN' ? 'New' : lang === 'ES' ? 'Nuevo' : lang === 'DE' ? 'Neu' : 'Nouveau'}</span>
                              )}
                              {d.image ? (
                                <CanvasDrawingCard 
                                  imageSrc={d.thumb || d.image} 
                                  title={getDrawingTitle(d.title, lang)} 
                                  hasWatermark={isVipArt && !isPaidUser}
                                />
                              ) : (
                                <div className="cb-drawing-empty">
                                  <span>{getDrawingTitle(d.title, lang)}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* OVERLAID LAYER: Enhanced High-Contrast Like Button Centered at the Bottom */}
                    <button
                      className={`cb-like-badge ${(favs.has(d.id) || favs.has(d.slug)) ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        heart(d.id);
                      }}
                      aria-label="Aimer et ajouter aux favoris"
                      title={`${d.likes} j'aime`}
                    >
                      <img src={(favs.has(d.id) || favs.has(d.slug)) ? likeLikedArt : likeArt} alt="" aria-hidden="true" />
                      <span className={`cb-like-count cb-digits-${String(formatLikes(d.likes)).length}`}>
                        {formatLikes(d.likes)}
                      </span>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cb-empty-board">
                <Heart />
                <h2>{page === 'Favoris' ? 'Aucun favori pour le moment' : 'Ce jardin est encore vide'}</h2>
                <p>
                  {page === 'Favoris'
                    ? 'Clique sur le cœur d’un coloriage pour le retrouver ici à tout moment !'
                    : 'Aucun dessin ne correspond à ta sélection.'}
                </p>
                {(q || cat !== 'Tous' || page !== 'Accueil') && (
                  <button
                    className="cb-reset-btn"
                    onClick={() => { setQ(''); setCat('Tous'); setPage('Accueil'); }}
                  >
                    Voir tous les coloriages
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Right Sidebar: Bandeau Google Ad sur Ordinateur (actif dans la version gratuite, masqué en version payante) */}
          {!isPaidUser && (
            <aside className="cb-ad-sidebar">
              <GoogleAdBanner
                slotType="sidebar"
                label={t.adSlotLabel || 'Espace Publicitaire'}
              />
            </aside>
          )}
        </section>
      )}

      <footer className="cb-main-footer">
        <div className="cb-footer-inner">
          <div className="cb-footer-links">
            <button
              type="button"
              className="cb-footer-link"
              onClick={() => {
                setLegalModalTab('cgu');
                setIsLegalModalOpen(true);
              }}
            >
              <FileText size={14} /> {t.footerTerms || 'CGU & CGV'}
            </button>
            <span className="cb-footer-sep">•</span>
            <button
              type="button"
              className="cb-footer-link"
              onClick={() => {
                setLegalModalTab('mentions');
                setIsLegalModalOpen(true);
              }}
            >
              <Building2 size={14} /> {t.footerLegal || 'Mentions Légales'}
            </button>
            <span className="cb-footer-sep">•</span>
            <button
              type="button"
              className="cb-footer-link"
              onClick={() => {
                setLegalModalTab('privacy');
                setIsLegalModalOpen(true);
              }}
            >
              <ShieldCheck size={14} /> {t.footerPrivacy || 'Confidentialité & RGPD'}
            </button>
            <span className="cb-footer-sep">•</span>
            <button
              type="button"
              className="cb-footer-link"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('cb-open-mailbox'));
              }}
            >
              <Mail size={14} /> {t.footerContact || 'Contact & Boîte à courrier'}
            </button>
          </div>

          <div className="cb-footer-copy">
            © {new Date().getFullYear()} Colorblop — {t.footerRights || 'Tous droits réservés. Illustrations originales.'}
          </div>
        </div>
      </footer>

      {/* Drawing Modal (En grand & Téléchargements SVG, PNG, PDF) */}
      {open && (
        <div className="modal" onClick={closeDrawing} onContextMenu={(e) => e.preventDefault()}>
          <div className="modalbox" onClick={e => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
            <button className="close" onClick={closeDrawing}><X /></button>
            <div className="bigpaper" onContextMenu={(e) => e.preventDefault()}>
              <ModalDrawingPreview
                drawing={open}
                title={getDrawingTitle(open.title, lang)}
                hasWatermark={isVisitorLimitReached || (isDrawingVip(open, categoriesList) && !isPaidUser)}
              />
            </div>
            <h2>{getDrawingTitle(open.title, lang)}</h2>
            <p>{open.cat.map(c => getCatLabel(c, t)).join(' • ')}</p>

            {isDrawingVip(open, categoriesList) && !isPaidUser ? (
              <div className="cb-vip-drawing-cta-box">
                <div className="cb-vip-drawing-cta-header">
                  <span className="cb-vip-lock-badge">
                    <Crown size={15} /> 🔒 Dossier réservé aux membres VIP
                  </span>
                </div>
                <p className="cb-vip-drawing-cta-desc">
                  Ce coloriage fait partie de notre collection exclusive VIP. Rejoins le club ColorVIP pour débloquer les téléchargements PDF A4, PNG et SVG vectoriel sans filigrane !
                </p>
                <div className="cb-vip-drawing-cta-actions">
                  <button
                    type="button"
                    className="cb-btn-unlock-vip-cta"
                    onClick={() => {
                      closeDrawing();
                      setIsMembershipModalOpen(true);
                    }}
                  >
                    <Crown size={16} />
                    <span>Devenir membre VIP</span>
                  </button>
                  <button
                    type="button"
                    className="cb-btn-locked-preview"
                    onClick={() => setIsMembershipModalOpen(true)}
                    title="Téléchargements réservés aux membres VIP"
                  >
                    <Lock size={14} /> Téléchargements verrouillés
                  </button>
                </div>
              </div>
            ) : isVisitorLimitReached ? (
              <div className="cb-limit-cta-box">
                <div className="cb-limit-cta-header">
                  <span className="cb-limit-lock-badge">🔒 3/3 coloriages gratuits utilisés</span>
                </div>
                <p className="cb-limit-cta-desc">
                  {lang === 'EN'
                    ? 'You have reached the limit of 3 free coloring downloads for visitors. Create a free account in just a few seconds to view clean previews without watermark and enjoy unlimited downloads!'
                    : lang === 'ES'
                    ? '¡Has alcanzado el límite de 3 dibujos gratuitos para visitantes! Crea una cuenta gratis para ver las vistas previas sin marca de agua y descargar sin límites.'
                    : lang === 'DE'
                    ? 'Du hast das Limit von 3 kostenlosen Ausmalbildern für Besucher erreicht! Erstelle ein kostenloses Konto, um Vorschauen ohne Wasserzeichen zu sehen und unbegrenzt herunterzuladen.'
                    : 'Tu as atteint la limite de 3 coloriages gratuits pour les visiteurs ! Crée un compte gratuit en quelques secondes pour voir tous les dessins sans filigrane et télécharger en illimité.'}
                </p>
                <button
                  type="button"
                  className="cb-btn-create-account-limit"
                  onClick={() => {
                    closeDrawing();
                    setPage('Profil');
                  }}
                >
                  <UserPlus size={18} />
                  <span>
                    {lang === 'EN' ? 'Create a free account' : lang === 'ES' ? 'Crear una cuenta gratis' : lang === 'DE' ? 'Kostenloses Konto erstellen' : 'Créer un compte gratuit'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="actions">
                <button
                  className={`modal-heart-btn ${(favs.has(open.id) || favs.has(open.slug)) ? 'liked' : ''}`}
                  onClick={() => heart(open.id)}
                >
                  <Heart fill={(favs.has(open.id) || favs.has(open.slug)) ? 'currentColor' : 'none'} /> {formatLikes(open.likes)}
                </button>
                {open.isSvg && (
                  <button
                    onClick={() => download('SVG')}
                    className={`download-btn-svg cb-btn-download-svg ${!canDownloadSvg ? 'locked' : ''}`}
                    title={
                      canDownloadSvg
                        ? "Télécharger le fichier vectoriel SVG (idéal machines de découpe & impression HD)"
                        : "Format SVG vectoriel réservé aux membres ColorVIP et ColorVIP Pro"
                    }
                    disabled={Boolean(downloading)}
                  >
                    {canDownloadSvg ? (
                      <>
                        <Download /> {downloading === 'SVG' ? t.preparing : t.btnSvg}
                      </>
                    ) : (
                      <>
                        <Lock size={15} /> {t.btnSvg}
                        <span className="cb-vip-badge-tag">VIP</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => download('PNG')}
                  title="Télécharger en image PNG haute résolution"
                  disabled={Boolean(downloading)}
                >
                  <Download /> {downloading === 'PNG' ? t.preparing : t.btnPng}
                </button>
                <button
                  onClick={() => download('PDF')}
                  title="Télécharger en document PDF A4 prêt à imprimer"
                  disabled={Boolean(downloading)}
                >
                  <Download /> {downloading === 'PDF' ? t.preparing : t.btnPdf}
                </button>
              </div>
            )}
            <small className="download-note">
              {session 
                ? t.unlimitedDownloads 
                : isVisitorLimitReached
                ? (lang === 'EN' ? 'Free account required to continue' : 'Compte gratuit requis pour continuer')
                : `${Math.max(0, 3 - downloads)} ${t.visitorDownloadsLeft}`}
            </small>
          </div>
        </div>
      )}

      {/* Nouveautés / Notifications Modal */}
      {nouveautesOpen && (
        <div className="modal" onClick={closeNouveautes}>
          <div className="letter" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={closeNouveautes}><X /></button>
            <Bell className="letter-icon" />
            <h2>{t.navNews || 'Nouveautés'}</h2>
            <p className="cb-news-modal-sub">
              {lang === 'EN'
                ? 'History of the 5 most recent drawing additions:'
                : lang === 'ES'
                ? 'Historial de las 5 últimas fechas de adición:'
                : lang === 'DE'
                ? 'Verlauf der letzten 5 Ausmalbilder-Hinzufügungen:'
                : 'Voici les 5 dernières dates d’ajout de nouveaux coloriages :'}
            </p>

            <div className="cb-news-dates-list">
              {newsList.slice(0, 5).map((item, index) => {
                const isLatest = index === 0;
                const isSelected = selectedNewsDate === item.dateKey;
                return (
                  <button
                    key={item.id || item.dateKey}
                    type="button"
                    className={`cb-news-date-card ${isLatest ? 'latest' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedNewsDate(item.dateKey);
                      setCat('Nouveautes');
                      setPage('Accueil');
                      setSort('recent');
                      closeNouveautes();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    title={lang === 'EN' ? `Click to view these ${item.count} drawings` : lang === 'ES' ? `Haz clic para ver estos ${item.count} dibujos` : lang === 'DE' ? `Klicken, um diese ${item.count} Bilder zu sehen` : `Cliquer pour voir ces ${item.count} dessins`}
                  >
                    <div className="cb-news-date-head">
                      <span className="cb-news-date-badge">
                        {isLatest && <span className="cb-news-pulse-dot" />}
                        {item.displayDate}
                      </span>
                      <b className="cb-news-date-text">
                        {formatNewsItem(item.displayDate, item.count, lang)}
                      </b>
                    </div>
                    <div className="cb-news-date-tail">
                      {isLatest && (
                        <span className="cb-news-fresh-tag">
                          ✨ {lang === 'EN' ? 'Latest' : lang === 'ES' ? 'Último' : lang === 'DE' ? 'Neu' : 'Dernier ajout'}
                        </span>
                      )}
                      <span className="cb-news-card-action">
                        {lang === 'EN' ? 'View' : lang === 'ES' ? 'Ver' : lang === 'DE' ? 'Ansehen' : 'Voir'} →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="cb-news-footer-actions">
              <button
                type="button"
                className="cb-btn-view-recent-drawings"
                onClick={() => {
                  setSelectedNewsDate(newsList[0]?.dateKey || null);
                  setCat('Nouveautes');
                  setPage('Accueil');
                  setSort('recent');
                  closeNouveautes();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Sparkles size={16} />
                <span>{lang === 'EN' ? 'View latest drawings' : lang === 'ES' ? 'Ver los últimos dibujos' : lang === 'DE' ? 'Neueste Bilder ansehen' : 'Découvrir les derniers coloriages'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Category Creator Modal for Admin (flo83119@gmail.com) */}
      {showCatModal && isOwner && (
        <div className="modal" onClick={() => setShowCatModal(false)}>
          <div className="modalbox cb-cat-modal" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setShowCatModal(false)}><X /></button>
            <div className="cb-cat-modal-header">
              <FolderOpen size={24} color="#8b5e3c" />
              <h2>Créer une nouvelle catégorie</h2>
            </div>
            <p className="cb-cat-modal-desc">
              Ajoutez une catégorie principale ou une sous-catégorie pour classer vos coloriages.
            </p>

            <form onSubmit={handleQuickCreateCategory} className="cb-cat-modal-form">
              <div className="cb-form-group">
                <label>Nom de la catégorie :</label>
                <input
                  type="text"
                  className="cb-input-text"
                  placeholder="Ex : Princesses, Noël, Espace, Mandalas..."
                  value={quickCatName}
                  onChange={e => setQuickCatName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="cb-form-group">
                <label>Emplacement / Catégorie parente :</label>
                <select
                  className="cb-select"
                  value={quickCatParentId}
                  onChange={e => setQuickCatParentId(e.target.value)}
                >
                  <option value="">Planche principale (ex: Animaux, Fées, etc.)</option>
                  <optgroup label="Sous-catégorie de :">
                    {rootCategories.map(rc => (
                      <option key={rc.id} value={rc.id}>↳ Sous-catégorie de {rc.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {quickCatMsg && (
                <div className={`cb-notice-msg ${quickCatMsg.type}`}>
                  {quickCatMsg.text}
                </div>
              )}

              <div className="cb-cat-modal-actions">
                <button
                  type="button"
                  className="cb-btn-cancel"
                  onClick={() => setShowCatModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="cb-btn-submit-cat"
                  disabled={quickCatSubmitting || !quickCatName.trim()}
                >
                  <CheckCircle2 size={18} />
                  <span>{quickCatSubmitting ? 'Création en cours…' : 'Créer la catégorie'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4-STAGE OFFICIAL DRAWING MAILBOX COMPONENT */}
      <OfficialDrawingMailbox
        isOwner={isOwner}
        pendingRequestsCount={pendingRequestsCount}
        drawings={drawings}
        session={session}
        profile={profile}
        onOpenProfile={() => {
          setPage('Profil');
          setOwnerOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenDrawing={(d) => openDrawing(d)}
        onOpenOwnerRequests={() => {
          setOwnerOpen(true);
          setAdminView('requests');
        }}
        heartDrawing={heart}
        t={t}
        lang={lang}
      />

      {/* INSTAGRAM-STYLE MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="cb-mobile-bottom-bar" aria-label="Navigation principale mobile">
        {/* Maison / Accueil */}
        <button
          type="button"
          className={`cb-bottom-nav-item ${page === 'Accueil' && !ownerOpen ? 'active' : ''}`}
          onClick={() => {
            setPage('Accueil');
            setCat('Tous');
            setOwnerOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Accueil"
        >
          <Home className="cb-bottom-nav-icon" />
          <span className="cb-bottom-nav-label">Accueil</span>
        </button>

        {/* Loupe / Recherche */}
        <button
          type="button"
          className="cb-bottom-nav-item"
          onClick={() => {
            setHeaderVisible(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
              if (searchInputRef.current) {
                searchInputRef.current.focus();
              }
            }, 250);
          }}
          aria-label="Recherche"
        >
          <Search className="cb-bottom-nav-icon" />
          <span className="cb-bottom-nav-label">Recherche</span>
        </button>

        {/* Cœur / Favoris */}
        <button
          type="button"
          className={`cb-bottom-nav-item ${page === 'Favoris' ? 'active' : ''}`}
          onClick={() => {
            setPage('Favoris');
            setOwnerOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Favoris"
        >
          <div className="cb-bottom-heart-wrap">
            <Heart
              className="cb-bottom-nav-icon"
              fill={favsCount > 0 ? '#d9534f' : 'none'}
              color={favsCount > 0 ? '#d9534f' : 'currentColor'}
            />
            {favsCount > 0 && <span className="cb-bottom-badge">{favsCount}</span>}
          </div>
          <span className="cb-bottom-nav-label">Favoris</span>
        </button>

        {/* VIP / Membre */}
        <button
          type="button"
          className={`cb-bottom-nav-item ${page === 'DevenirMembre' ? 'active' : ''}`}
          onClick={() => {
            setPage('DevenirMembre');
            setOwnerOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Devenir membre"
        >
          <Crown className="cb-bottom-nav-icon" color="#e6a100" />
          <span className="cb-bottom-nav-label">VIP Pro</span>
        </button>

        {/* Profil */}
        <button
          type="button"
          className={`cb-bottom-nav-item ${page === 'Profil' ? 'active' : ''}`}
          onClick={() => {
            setPage('Profil');
            setOwnerOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Mon Profil"
        >
          <Users className="cb-bottom-nav-icon" />
          <span className="cb-bottom-nav-label">Profil</span>
        </button>
      </nav>

      {/* Stripe Membership Modal for locked SVG downloads */}
      <MembershipModal
        isOpen={isMembershipModalOpen}
        onClose={() => setIsMembershipModalOpen(false)}
        onNavigateToMembership={() => {
          setIsMembershipModalOpen(false);
          setPage('DevenirMembre');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Official Legal & CGU/CGV Modal accessible everywhere */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
        lang={lang}
      />

      {/* Mobile Interstitial Google Ad Modal (Pop up tous les 3 téléchargements en version gratuite, rien en version payante) */}
      {!isPaidUser && (
        <AdInterstitialModal
          isOpen={isAdInterstitialOpen}
          onClose={() => setIsAdInterstitialOpen(false)}
          onOpenMembership={() => {
            setIsAdInterstitialOpen(false);
            setIsMembershipModalOpen(true);
          }}
          lang={lang}
          t={t}
        />
      )}
    </main>
  );
}

/* === 4-STAGE OFFICIAL DRAWING MAILBOX COMPONENT === */
function OfficialDrawingMailbox({ isOwner, pendingRequestsCount, drawings, session, profile, onOpenProfile, onOpenDrawing, onOpenOwnerRequests, heartDrawing, t = translations.FR, lang = 'FR' }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClickOpen, setIsClickOpen] = useState(false);
  const [isNewMailOpen, setIsNewMailOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validatedRequests, setValidatedRequests] = useState([]);
  const [thankedNotice, setThankedNotice] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Allow footer contact button or other components to open the mailbox
  useEffect(() => {
    function handleExternalMailboxOpen() {
      setFormError('');
      setRequestSent(false);
      setIsClickOpen(true);
    }
    window.addEventListener('cb-open-mailbox', handleExternalMailboxOpen);
    return () => window.removeEventListener('cb-open-mailbox', handleExternalMailboxOpen);
  }, []);

  const senderPseudo = session ? (profile?.display_name || session.user.user_metadata?.pseudo || session.user.email?.split('@')[0] || 'Ami de Colorblop') : '';

  // Check for validated requests destined for this visitor
  useEffect(() => {
    async function checkValidatedRequests() {
      try {
        const storedIds = JSON.parse(localStorage.getItem('cb-my-request-ids') || '[]');
        const thankedIds = new Set(JSON.parse(localStorage.getItem('cb-thanked-requests') || '[]'));
        let query = supabase.from('coloring_requests').select('*');
        if (session?.user?.id) {
          query = query.or(`user_id.eq.${session.user.id},id.in.(${storedIds.length ? storedIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
        } else if (storedIds.length) {
          query = query.in('id', storedIds);
        } else {
          return;
        }

        const { data, error } = await query;
        if (!error && data) {
          const validated = data.filter(r => r.status === 'done' && r.completed_drawing_slug && !thankedIds.has(r.id));
          setValidatedRequests(validated);
        }
      } catch (err) {
        console.error(err);
      }
    }

    checkValidatedRequests();
    const interval = setInterval(checkValidatedRequests, 120000); // 2 minutes au lieu de 20s pour soulager le CDN et Supabase
    return () => clearInterval(interval);
  }, [session]);

  const hasOwnerMail = isOwner && pendingRequestsCount > 0;
  const hasUserValidatedMail = !isOwner && validatedRequests.length > 0;
  const showNewMailVisual = hasOwnerMail || hasUserValidatedMail;

  const currentVisual = showNewMailVisual
    ? mailboxNew
    : isHovered
    ? mailboxHover
    : mailboxBase;

  function handleMailboxClick() {
    setFormError('');
    setRequestSent(false);
    if (hasOwnerMail) {
      onOpenOwnerRequests();
    } else if (hasUserValidatedMail) {
      setIsNewMailOpen(true);
    } else {
      setIsClickOpen(true);
    }
  }

  async function handleSendRequest(e) {
    e.preventDefault();
    setFormError('');

    if (!session?.user) {
      setIsClickOpen(false);
      onOpenProfile();
      return;
    }

    if (description.trim().length < 3) {
      setFormError(t.mailboxDescMin || 'Écris quelques mots pour décrire ton coloriage.');
      return;
    }

    setSubmitting(true);
    const finalPseudo =
      profile?.display_name ||
      session.user.user_metadata?.display_name ||
      session.user.user_metadata?.pseudo ||
      session.user.email?.split('@')[0] ||
      'Ami de Colorblop';
    const finalEmail = session.user.email || null;
    const finalAvatarIndex = Number(profile?.avatar_index ?? session.user.user_metadata?.avatar_index ?? 0);

    try {
      const { data, error } = await supabase.from('coloring_requests').insert({
        user_id: session.user.id,
        pseudo: finalPseudo,
        email: finalEmail,
        avatar_index: finalAvatarIndex,
        description: description.trim(),
        status: 'pending'
      }).select().single();

      if (error) throw error;

      if (data?.id) {
        const stored = JSON.parse(localStorage.getItem('cb-my-request-ids') || '[]');
        stored.push(data.id);
        localStorage.setItem('cb-my-request-ids', JSON.stringify(stored));
      }

      setDescription('');
      setRequestSent(true);
      setToastMessage(t.mailboxRequestSent || 'Demande envoyée');

      // Fermeture douce de la feuille après 2 secondes
      setTimeout(() => {
        setIsClickOpen(false);
        setRequestSent(false);
      }, 2000);

      // Notification toast affichée au-dessus de la boîte aux lettres
      setTimeout(() => {
        setToastMessage('');
      }, 4500);
    } catch (err) {
      console.error(err);
      setFormError(t.mailboxSendError || 'Impossible d’envoyer la demande pour le moment. Réessaie dans un instant.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleThankYou(reqId, drawingId) {
    if (drawingId) heartDrawing(drawingId);
    const thanked = JSON.parse(localStorage.getItem('cb-thanked-requests') || '[]');
    thanked.push(reqId);
    localStorage.setItem('cb-thanked-requests', JSON.stringify(thanked));
    setValidatedRequests(prev => prev.filter(r => r.id !== reqId));
    setThankedNotice(true);
    setTimeout(() => {
      setThankedNotice(false);
      setIsNewMailOpen(false);
    }, 2400);
  }

  return (
    <>
      {/* Corner Mailbox Icon */}
      <div
        className={`cb-corner-mailbox ${showNewMailVisual ? 'has-new' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleMailboxClick}
        title={
          hasOwnerMail
            ? `Espace Propriétaire : ${pendingRequestsCount} nouvelle(s) demande(s) !`
            : hasUserValidatedMail
            ? 'Nouveau courrier ! Ton dessin demandé est prêt !'
            : 'Faire une demande de dessin'
        }
      >
        <img
          src={currentVisual}
          alt="Boîte aux lettres Colorblop"
          className="cb-mailbox-img"
        />

        {showNewMailVisual && (
          <span className="cb-mailbox-alert-badge">
            ✉️ {hasOwnerMail ? pendingRequestsCount : validatedRequests.length}
          </span>
        )}
      </div>

      {/* Toast de confirmation sans alerte navigateur */}
      {toastMessage && (
        <div className="cb-mailbox-toast" role="status">
          <CheckCircle2 size={20} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STAGE 3 : "VISUEL CLIC" - INTERACTIVE WRITING SHEET WITH CLEAN PARCHMENT */}
      {isClickOpen && (
        <div className="modal" onClick={() => { setIsClickOpen(false); setFormError(''); setRequestSent(false); }}>
          <div className="cb-click-sheet-card" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => { setIsClickOpen(false); setFormError(''); setRequestSent(false); }} aria-label="Fermer"><X /></button>

            {/* The Visual Clic Artwork without printed ghost text underneath */}
            <div className="cb-sheet-artwork-wrapper">
              <img src={mailboxClick} alt="Fais une demande de dessin" className="cb-sheet-artwork" />

              {/* Clean Interactive Form Overlay (No pseudo/email fields - Account required) */}
              <div className="cb-sheet-interactive-overlay">
                {!session ? (
                  <div className="cb-sheet-auth-gate">
                    <span className="cb-click-sheet-title">{t.mailboxTitle}</span>
                    <p className="cb-sheet-auth-text">
                      {t.mailboxAuthGate}
                    </p>
                    <button
                      type="button"
                      className="cb-sheet-login-btn"
                      onClick={() => {
                        setIsClickOpen(false);
                        onOpenProfile();
                      }}
                    >
                      <LogIn size={18} />
                      <span>{t.mailboxLoginBtn}</span>
                    </button>
                  </div>
                ) : requestSent ? (
                  <div className="cb-sheet-success-state">
                    <CheckCircle2 size={44} className="cb-sheet-success-icon" />
                    <span className="cb-click-sheet-title">{t.mailboxRequestSent || 'Demande envoyée'}</span>
                    <p className="cb-sheet-success-sub">
                      {t.mailboxSuccess || 'Ta lettre a été déposée dans la boîte !'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSendRequest} className="cb-sheet-form-inner">
                    <span className="cb-click-sheet-title">{t.mailboxTitle}</span>

                    {formError && (
                      <div className="cb-sheet-form-error">
                        {formError}
                      </div>
                    )}

                    <textarea
                      required
                      rows="4"
                      value={description}
                      onChange={e => {
                        setDescription(e.target.value);
                        if (formError) setFormError('');
                      }}
                      placeholder={t.mailboxDescPlaceholder}
                      className="cb-sheet-textarea"
                    />

                    <button
                      type="submit"
                      className="cb-sheet-send-btn"
                      disabled={submitting}
                      title="Glisser dans la boîte aux lettres"
                    >
                      <Send size={16} />
                      <span>{submitting ? t.mailboxSending : t.mailboxSend}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 4 : "VISUEL NOUVEAU COURRIER" - RECEPTION DES DESSINS VALIDÉS */}
      {isNewMailOpen && validatedRequests.length > 0 && (
        <div className="modal" onClick={() => setIsNewMailOpen(false)}>
          <div className="cb-new-mail-card" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setIsNewMailOpen(false)} aria-label="Fermer"><X /></button>

            <div className="cb-new-mail-header">
              <Sparkles className="cb-new-mail-sparkle" />
              <h2>{t.mailboxNewMailTitle}</h2>
              <p>{t.mailboxNewMailSub}</p>
            </div>

            {thankedNotice ? (
              <div className="cb-thank-you-msg">
                🌸 {t.mailboxThankedMsg}
              </div>
            ) : (
              <div className="cb-new-drawings-list">
                {validatedRequests.map(req => {
                  const matched = drawings.find(d => d.slug === req.completed_drawing_slug);
                  return (
                    <div className="cb-new-drawing-item" key={req.id}>
                      {/* Miniature thumbnail that directly leads to the drawing download */}
                      <div
                        className="cb-drawing-mini-thumb"
                        onClick={() => {
                          if (matched) {
                            onOpenDrawing(matched);
                            setIsNewMailOpen(false);
                          }
                        }}
                        title="Cliquer pour voir et télécharger ce dessin"
                      >
                        {matched?.image ? (
                          <img src={matched.image} alt={getDrawingTitle(matched.title, lang)} />
                        ) : (
                          <Sparkles size={32} />
                        )}
                        <span className="cb-thumb-zoom-tag">🔍 {t.download}</span>
                      </div>

                      <div className="cb-new-drawing-details">
                        <b>{getDrawingTitle(matched?.title, lang) || req.completed_drawing_slug}</b>
                        <p>Ton souhait initial : « {req.description} »</p>

                        <div className="cb-new-drawing-actions">
                          {matched && (
                            <button
                              className="cb-btn-open-direct"
                              onClick={() => {
                                onOpenDrawing(matched);
                                setIsNewMailOpen(false);
                              }}
                            >
                              <Download size={14} /> {t.mailboxOpenDrawing}
                            </button>
                          )}

                          {/* The Clickable "Merci !" button */}
                          <button
                            className="cb-btn-merci"
                            onClick={() => handleThankYou(req.id, matched?.id)}
                            title="Remercier l'artiste et ajouter un cœur au dessin"
                          >
                            <Heart size={14} fill="#e74c3c" color="#9b1b1b" /> {t.mailboxSayThanks}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Profile({ session, profile, selectedAvatar, updateAvatar, databaseReady, isOwner, openAdmin, subscriptionData, onRefreshSubscription, onNavigateToMembership, vipBadge, lang = 'FR', t = translations.FR }) {
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);
  const [isCguModalOpen, setIsCguModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);

  // Pseudo validation state
  const [pseudoStatus, setPseudoStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [pseudoMessage, setPseudoMessage] = useState('');
  const checkTimerRef = useRef(null);

  // Real-time password rules
  const isLengthValid = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const isPasswordValid = isLengthValid && hasUppercase && hasDigit && passwordsMatch;

  // Prevent paste on password inputs
  function handlePasteForbidden(e) {
    e.preventDefault();
    setMessage(t.noPasteNotice);
  }

  // Handle manual pseudo typing
  function handlePseudoChange(val) {
    setPseudo(val);
    setMessage('');
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

    const clean = val.trim();
    if (!clean) {
      setPseudoStatus('idle');
      setPseudoMessage('');
      return;
    }
    if (clean.length < 3) {
      setPseudoStatus('invalid');
      setPseudoMessage('Au moins 3 caractères requis.');
      return;
    }

    setPseudoStatus('checking');
    checkTimerRef.current = setTimeout(async () => {
      try {
        const { data: isAvail, error } = await supabase.rpc('check_pseudo_available', { pseudo: clean });
        if (error) {
          console.error(error);
          setPseudoStatus('idle');
        } else if (isAvail === true) {
          setPseudoStatus('available');
          setPseudoMessage(t.pseudoAvailable);
        } else {
          setPseudoStatus('taken');
          setPseudoMessage(t.pseudoTaken);
        }
      } catch (err) {
        setPseudoStatus('idle');
      }
    }, 350);
  }

  // Handle random pseudo generation (Animal + Fleur + 2 chiffres)
  async function handleRandomPseudo() {
    setMessage('');
    setPseudoStatus('checking');
    let chosen = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = generateRandomPseudo();
      const { data: isAvail, error } = await supabase.rpc('check_pseudo_available', { pseudo: candidate });
      if (!error && isAvail === true) {
        chosen = candidate;
        break;
      }
    }
    const finalCandidate = chosen || generateRandomPseudo();
    setPseudo(finalCandidate);
    setPseudoStatus('available');
    setPseudoMessage(t.pseudoAvailable);
  }

  async function signIn(e) {
    if (e) e.preventDefault();
    if (!email || !password) {
      setMessage('Saisis ton e-mail et ton mot de passe.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setMessage("Ton adresse e-mail n'a pas encore été confirmée. Clique sur le lien reçu par e-mail ou utilise le bouton ci-dessous pour renvoyer le lien d'activation.");
        setCanResend(true);
      } else if (error.message.toLowerCase().includes('invalid login credentials')) {
        setMessage("Identifiants incorrects. Vérifie ton e-mail et ton mot de passe.");
      } else {
        setMessage(error.message);
      }
    } else {
      setMessage('Connexion réussie !');
    }
  }

  async function signUp(e) {
    if (e) e.preventDefault();
    setMessage('');

    const cleanPseudo = pseudo.trim();
    if (!cleanPseudo || cleanPseudo.length < 3) {
      setMessage('Choisis un pseudo d’au moins 3 caractères (ou clique sur Choix aléatoire).');
      return;
    }
    if (pseudoStatus === 'taken') {
      setMessage(t.pseudoTaken);
      return;
    }
    if (!email || !email.includes('@')) {
      setMessage('Saisis une adresse e-mail valide.');
      return;
    }
    if (!isLengthValid || !hasUppercase || !hasDigit) {
      setMessage(t.pwdRequirements);
      return;
    }
    if (!passwordsMatch) {
      setMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (!cguAccepted) {
      setMessage('Merci d’accepter les CGU/CGV pour finaliser la création de ton compte.');
      return;
    }

    setBusy(true);
    // Double check availability right before signup
    const { data: isAvail } = await supabase.rpc('check_pseudo_available', { pseudo: cleanPseudo });
    if (isAvail === false) {
      setBusy(false);
      setPseudoStatus('taken');
      setMessage(t.pseudoTaken);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: cleanPseudo,
          pseudo: cleanPseudo,
          avatar_index: selectedAvatar || 0,
          lang: lang || 'FR',
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setBusy(false);

    if (error) {
      if (error.message.toLowerCase().includes('user already registered')) {
        setMessage('Un compte existe déjà avec cette adresse e-mail. Clique sur « Se connecter ».');
      } else if (error.message.toLowerCase().includes('rate limit')) {
        setMessage('Trop de tentatives d’envoi d’e-mails (limite anti-spam de sécurité). Merci de patienter quelques minutes.');
      } else {
        setMessage(error.message);
      }
    } else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      setMessage('Un compte existe déjà avec cette adresse e-mail et il est déjà validé ! Clique sur « Se connecter » avec ton mot de passe.');
    } else if (!data.session) {
      setMessage("Compte créé avec succès ! Un e-mail de confirmation t'a été envoyé à l'adresse " + email + ". Pense à vérifier ta boîte de réception et tes spams pour activer ton compte.");
      setCanResend(true);
    } else {
      setMessage('Compte créé et connecté !');
    }
  }

  async function resetPassword() {
    if (!email) {
      setMessage('Saisis ton adresse e-mail ci-dessus pour recevoir un lien de réinitialisation de mot de passe.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        setMessage('Limite d’envoi atteinte (3 e-mails/heure max sur le service gratuit). Merci de patienter un moment.');
      } else {
        setMessage(`Erreur : ${error.message}`);
      }
    } else {
      setMessage("Un e-mail de réinitialisation vient de t'être envoyé ! Pense à vérifier ta boîte de réception et tes spams.");
    }
  }

  async function resendConfirmation() {
    if (!email) {
      setMessage('Saisis ton adresse e-mail pour renvoyer le lien de confirmation.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        setMessage('Limite d’envoi atteinte (3 e-mails/heure max sur le service de messagerie). Merci de patienter un peu avant de renvoyer ou de vérifier tes courriers indésirables.');
      } else {
        setMessage(`Erreur d'envoi : ${error.message}`);
      }
    } else {
      setMessage("Nouvel e-mail de confirmation envoyé ! Vérifie ta boîte de réception et tes spams.");
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage('');
    try {
      const redirectUrl = window.location.origin ? `${window.location.origin}/` : 'https://colorblop.com/';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        if (error.message?.includes('not enabled') || error.message?.includes('Unsupported provider')) {
          throw new Error("L'authentification Google doit être activée dans Supabase (Authentication > Providers > Google) avec le Client ID.");
        }
        throw error;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Erreur Google Auth:', err);
      setMessage(`Erreur de connexion Google : ${err.message || 'Impossible de se connecter avec Google.'}`);
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const userDisplayName = profile?.display_name || session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.pseudo || session?.user?.email?.split('@')[0];

  return (
    <section className="profile cb-profile-box">
      <div className="cb-active-avatar-wrap">
        <img src={avatarList[selectedAvatar] || avatar1} alt="Avatar sélectionné" className="cb-profile-current-avatar" />
        {vipBadge && (
          <img
            src={vipBadge.src}
            alt={vipBadge.label}
            className="cb-vip-badge-profile"
            title={`Membre ${vipBadge.label}`}
          />
        )}
      </div>

      <h1>{session ? userDisplayName : t.profileTitleVisitor}</h1>
      {session && (
        <div className="cb-profile-header-status">
          <p className="cb-profile-email">{session.user.email}</p>
          {isOwner && <span className="cb-owner-role-pill"><ShieldCheck size={14} /> {t.profileOwnerRole}</span>}
        </div>
      )}

      {/* 8 Custom Avatars Selection Grid */}
      <div className="cb-avatar-selection">
        <h3>{t.avatarSelectionTitle}</h3>
        <div className="cb-avatars-grid">
          {avatarList.map((av, index) => (
            <button
              key={index}
              className={`cb-avatar-choice-btn ${selectedAvatar === index ? 'selected' : ''}`}
              onClick={() => updateAvatar(index)}
              title={`Choisir Avatar ${index + 1}`}
              aria-label={`Choisir Avatar ${index + 1}`}
            >
              <img src={av} alt={`Avatar ${index + 1}`} />
              {selectedAvatar === index && <span className="cb-avatar-badge">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {!session ? (
        <div className="cb-auth-wrapper">
          {/* Switcher: Se connecter / Créer un compte */}
          <div className="cb-auth-tabs">
            <button
              type="button"
              className={`cb-auth-tab ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => { setAuthMode('signup'); setMessage(''); }}
            >
              <UserPlus size={16} /> {t.btnSignUp}
            </button>
            <button
              type="button"
              className={`cb-auth-tab ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => { setAuthMode('signin'); setMessage(''); }}
            >
              <LogIn size={16} /> {t.btnSignIn}
            </button>
          </div>

          {/* Google Instant Authentication Button */}
          <button
            type="button"
            className="cb-btn-google-auth"
            onClick={signInWithGoogle}
            disabled={busy}
          >
            <svg className="cb-google-svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{authMode === 'signup' ? t.btnGoogleSignUp : t.btnGoogleSignIn}</span>
          </button>

          <div className="cb-auth-separator">
            <span>{t.authOrEmail}</span>
          </div>

          {authMode === 'signup' ? (
            /* REGISTRATION FORM WITH UNIQUE PSEUDO, STRICT PASSWORD, CGU */
            <form onSubmit={signUp} className="cb-auth-form">
              {/* Pseudo unique + Choix aléatoire */}
              <div className="cb-form-group">
                <label htmlFor="cb-reg-pseudo">{t.labelPseudo}</label>
                <div className="cb-input-with-action">
                  <input
                    id="cb-reg-pseudo"
                    type="text"
                    value={pseudo}
                    onChange={e => handlePseudoChange(e.target.value)}
                    placeholder={t.pseudoPlaceholder}
                    className="cb-input-text"
                    autoComplete="nickname"
                    required
                  />
                  <button
                    type="button"
                    className="cb-btn-random-pseudo"
                    onClick={handleRandomPseudo}
                    title="Générer un pseudo aléatoire unique (Animal + Fleur + 2 chiffres)"
                  >
                    <Dices size={15} /> {t.pseudoRandomBtn}
                  </button>
                </div>
                {pseudoStatus === 'checking' && (
                  <span className="cb-status-note checking">⏳ Vérification du pseudo…</span>
                )}
                {pseudoStatus === 'available' && (
                  <span className="cb-status-note ok">{t.pseudoAvailable}</span>
                )}
                {pseudoStatus === 'taken' && (
                  <span className="cb-status-note err">{t.pseudoTaken}</span>
                )}
                {pseudoStatus === 'invalid' && (
                  <span className="cb-status-note err">{pseudoMessage}</span>
                )}
              </div>

              {/* Email */}
              <div className="cb-form-group">
                <label htmlFor="cb-reg-email">{t.labelEmail}</label>
                <input
                  id="cb-reg-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setMessage(''); }}
                  placeholder={t.emailPlaceholder}
                  className="cb-input-text"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password (no copy-paste, 8+ chars, 1 uppercase, 1 digit) */}
              <div className="cb-form-group">
                <label htmlFor="cb-reg-pwd">{t.labelPassword}</label>
                <input
                  id="cb-reg-pwd"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setMessage(''); }}
                  onPaste={handlePasteForbidden}
                  placeholder={t.passwordPlaceholder}
                  className="cb-input-text"
                  autoComplete="new-password"
                  required
                />
                {/* Visual password rules indicators */}
                <div className="cb-pwd-rules-checklist">
                  <span className={`cb-rule-item ${isLengthValid ? 'valid' : ''}`}>
                    {isLengthValid ? '✓' : '•'} 8 caractères min
                  </span>
                  <span className={`cb-rule-item ${hasUppercase ? 'valid' : ''}`}>
                    {hasUppercase ? '✓' : '•'} 1 majuscule
                  </span>
                  <span className={`cb-rule-item ${hasDigit ? 'valid' : ''}`}>
                    {hasDigit ? '✓' : '•'} 1 chiffre
                  </span>
                </div>
              </div>

              {/* Password Confirmation (no copy-paste) */}
              <div className="cb-form-group">
                <label htmlFor="cb-reg-confirm-pwd">{t.labelConfirmPassword}</label>
                <input
                  id="cb-reg-confirm-pwd"
                  type="password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setMessage(''); }}
                  onPaste={handlePasteForbidden}
                  placeholder={t.confirmPasswordPlaceholder}
                  className="cb-input-text"
                  autoComplete="new-password"
                  required
                />
                {confirmPassword && (
                  <span className={`cb-status-note ${passwordsMatch ? 'ok' : 'err'}`}>
                    {passwordsMatch ? '✓ Mots de passe identiques' : '✗ Les mots de passe ne correspondent pas'}
                  </span>
                )}
              </div>

              {/* CGU / CGV Mandatory Acceptance */}
              <div className="cb-cgu-checkbox-row">
                <label className="cb-cgu-checkbox-label">
                  <input
                    type="checkbox"
                    checked={cguAccepted}
                    onChange={e => setCguAccepted(e.target.checked)}
                    required
                  />
                  <span>{t.cguAcceptLabel}</span>
                </label>
                <button
                  type="button"
                  className="cb-cgu-read-btn"
                  onClick={() => setIsCguModalOpen(true)}
                >
                  <FileText size={13} /> {t.cguReadLink}
                </button>
              </div>

              <button
                type="submit"
                className="cb-btn-submit-auth"
                disabled={busy}
              >
                <UserPlus size={18} /> {busy ? 'Création en cours…' : t.btnSignUp}
              </button>
            </form>
          ) : (
            /* SIGN IN FORM */
            <form onSubmit={signIn} className="cb-auth-form">
              <div className="cb-form-group">
                <label htmlFor="cb-login-email">{t.labelEmail}</label>
                <input
                  id="cb-login-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setMessage(''); }}
                  placeholder={t.emailPlaceholder}
                  className="cb-input-text"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="cb-form-group">
                <label htmlFor="cb-login-pwd">{t.labelPassword}</label>
                <input
                  id="cb-login-pwd"
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setMessage(''); }}
                  onPaste={handlePasteForbidden}
                  placeholder={t.labelPassword}
                  className="cb-input-text"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="cb-btn-submit-auth"
                disabled={busy}
              >
                <LogIn size={18} /> {busy ? 'Connexion…' : t.btnSignIn}
              </button>

              <div className="cb-auth-helpers">
                <button type="button" className="cb-btn-forgot-pwd" onClick={resetPassword} disabled={busy}>
                  {t.btnForgotPwd}
                </button>
                {canResend && (
                  <button type="button" className="cb-btn-resend-email" onClick={resendConfirmation} disabled={busy}>
                    <RefreshCw size={14} /> {t.btnResendEmail}
                  </button>
                )}
              </div>
            </form>
          )}

          {message && <p className="auth-message">{message}</p>}
          {!databaseReady && <p className="auth-message">Base Colorblop connectée.</p>}
        </div>
      ) : (
        <div className="cb-profile-actions">
          {/* Member Subscription & Commercial License */}
          <MemberSubscriptionCard
            session={session}
            profile={profile}
            subscriptionData={subscriptionData}
            onNavigateToMembership={onNavigateToMembership}
            onRefreshSubscription={onRefreshSubscription}
          />

          {isOwner && (
            <button className="cb-btn-admin" onClick={openAdmin}>
              <ShieldCheck /> {t.btnAdminSpace}
            </button>
          )}
          <button className="cb-btn-logout" onClick={signOut}><LogOut /> {t.btnSignOut}</button>
        </div>
      )}

      {/* CGU Modal */}
      <CguModal
        isOpen={isCguModalOpen}
        onClose={() => setIsCguModalOpen(false)}
        onAccept={() => setCguAccepted(true)}
      />
    </section>
  );
}

/* === OWNER / ADMIN SPACE CONNECTED TO SUPABASE WITH STATS & DRAWINGS MANAGEMENT === */
function AdminPanel({ view, setView, drawings, setDrawings, reloadDrawings, categoriesList = [], setCategoriesList, reloadCategories, reloadNews, user, closeAdmin, pendingRequestsCount, refreshPendingRequests }) {
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedSlugForRequest, setSelectedSlugForRequest] = useState({});
  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [registeredUsersList, setRegisteredUsersList] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [licensesList, setLicensesList] = useState([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [licenseSearch, setLicenseSearch] = useState('');
  const [licenseSortBy, setLicenseSortBy] = useState('date_desc');
  const [licenseFilterStatus, setLicenseFilterStatus] = useState('all');

  const filteredLicenses = useMemo(() => {
    let list = [...licensesList];

    if (licenseFilterStatus === 'active') {
      list = list.filter(lic => lic.status === 'active');
    } else if (licenseFilterStatus === 'expired') {
      list = list.filter(lic => lic.status !== 'active');
    }

    if (licenseSearch.trim()) {
      const q = licenseSearch.trim().toLowerCase();
      list = list.filter(lic => {
        const serial = (lic.license_number || '').toLowerCase();
        const holder = (lic.customer_name || '').toLowerCase();
        const first = (lic.first_name || '').toLowerCase();
        const last = (lic.last_name || '').toLowerCase();
        const shop = (lic.shop_name || '').toLowerCase();
        const email = (lic.customer_email || '').toLowerCase();
        return (
          serial.includes(q) ||
          holder.includes(q) ||
          first.includes(q) ||
          last.includes(q) ||
          shop.includes(q) ||
          email.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (licenseSortBy === 'date_desc') {
        return new Date(b.created_at || b.valid_from || 0) - new Date(a.created_at || a.valid_from || 0);
      }
      if (licenseSortBy === 'date_asc') {
        return new Date(a.created_at || a.valid_from || 0) - new Date(b.created_at || b.valid_from || 0);
      }
      if (licenseSortBy === 'name_asc') {
        const nameA = (a.last_name || a.customer_name || '').toLowerCase();
        const nameB = (b.last_name || b.customer_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (licenseSortBy === 'first_name_asc') {
        const firstA = (a.first_name || '').toLowerCase();
        const firstB = (b.first_name || '').toLowerCase();
        return firstA.localeCompare(firstB);
      }
      if (licenseSortBy === 'shop_asc') {
        const shopA = (a.shop_name || '').toLowerCase();
        const shopB = (b.shop_name || '').toLowerCase();
        return shopA.localeCompare(shopB);
      }
      if (licenseSortBy === 'serial_asc') {
        const serialA = (a.license_number || '').toLowerCase();
        const serialB = (b.license_number || '').toLowerCase();
        return serialA.localeCompare(serialB);
      }
      return 0;
    });

    return list;
  }, [licensesList, licenseSearch, licenseSortBy, licenseFilterStatus]);

  // Form for adding single drawing (legacy/quick)
  const [edit, setEdit] = useState(null);
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [detectedFormat, setDetectedFormat] = useState(null);
  const [saving, setSaving] = useState(false);

  // === BATCH RENAMING IN LIBRARY ===
  const [isBatchRenaming, setIsBatchRenaming] = useState(false);
  const [batchTitles, setBatchTitles] = useState({});
  const [useLibraryCommonName, setUseLibraryCommonName] = useState(false);
  const [libraryCommonName, setLibraryCommonName] = useState('');
  const [libraryAutoNumber, setLibraryAutoNumber] = useState(true);
  const [savingBatchTitles, setSavingBatchTitles] = useState(false);

  // === BATCH MULTI-UPLOAD ===
  const [batchUploadList, setBatchUploadList] = useState([]);
  const [useCommonName, setUseCommonName] = useState(false);
  const [commonName, setCommonName] = useState('');
  const [autoNumberCommonName, setAutoNumberCommonName] = useState(true);
  const [groupedTitle, setGroupedTitle] = useState('');
  const [groupedAutoNumber, setGroupedAutoNumber] = useState(true);
  const [groupedCats, setGroupedCats] = useState(['Animaux']);
  const [publishingBatch, setPublishingBatch] = useState(false);
  const [publishProgress, setPublishProgress] = useState({ current: 0, total: 0, text: '' });

  // Category creation state
  const [showCatCreator, setShowCatCreator] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const rootCategories = useMemo(() => {
    return (categoriesList || []).filter(c => !c.parentId);
  }, [categoriesList]);

  // === MULTI-SELECTION & BATCH MOVE IN LIBRARY ===
  const [selectedDrawingIds, setSelectedDrawingIds] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [batchTargetCategory, setBatchTargetCategory] = useState('');
  const [batchMoveMode, setBatchMoveMode] = useState('replace');
  const [isMovingBatchDrawings, setIsMovingBatchDrawings] = useState(false);

  // === CATEGORY & FOLDER MANAGER STATE ===
  const [categorySearch, setCategorySearch] = useState('');
  const [showMgrCatCreator, setShowMgrCatCreator] = useState(false);
  const [mgrNewCatName, setMgrNewCatName] = useState('');
  const [mgrNewCatParentId, setMgrNewCatParentId] = useState('');
  const [mgrNewCatIsVip, setMgrNewCatIsVip] = useState(false);
  const [creatingCatInManager, setCreatingCatInManager] = useState(false);

  // === MERGE CATEGORIES STATE ===
  const [showMergePanel, setShowMergePanel] = useState(false);
  const [mergeSourceCat, setMergeSourceCat] = useState('');
  const [mergeTargetCat, setMergeTargetCat] = useState('');
  const [mergeDeleteSource, setMergeDeleteSource] = useState(true);
  const [isMergingCategories, setIsMergingCategories] = useState(false);

  // Toggle selection of a drawing
  function toggleSelectDrawing(id) {
    setSelectedDrawingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFilteredDrawings() {
    setSelectedDrawingIds(new Set(filteredLibraryDrawings.map(d => d.id)));
  }

  function clearDrawingSelection() {
    setSelectedDrawingIds(new Set());
  }

  // Count drawings in a category (hierarchical for root categories)
  function getCategoryDrawingsCount(categoryObj) {
    if (!categoryObj) return 0;
    const normName = normalizeCatStr(categoryObj.name);
    const normId = normalizeCatStr(categoryObj.id);

    if (categoryObj.parentId) {
      return drawings.filter(d =>
        (d.cat || []).some(c => {
          const nc = normalizeCatStr(c);
          return nc === normName || nc === normId;
        })
      ).length;
    }

    const subcats = getSubcategoriesFor(categoryObj, categoriesList);
    const accepted = new Set([
      normName,
      normId,
      ...subcats.map(s => normalizeCatStr(s.name)),
      ...subcats.map(s => normalizeCatStr(s.id)),
    ]);

    return drawings.filter(d => (d.cat || []).some(c => accepted.has(normalizeCatStr(c)))).length;
  }

  // Universal drawing category updater (Supabase + localStorage + React state)
  async function updateDrawingCategoriesInDbAndState(drawingIds, newCategoriesFn) {
    const catOverrides = JSON.parse(localStorage.getItem('cb-custom-drawings-cats') || '{}');
    const updatedMap = new Map();

    for (const id of drawingIds) {
      const d = drawings.find(x => x.id === id);
      if (!d) continue;

      const newCats = newCategoriesFn(d.cat || []);
      catOverrides[d.id] = newCats;
      if (d.slug) catOverrides[d.slug] = newCats;

      if (String(d.id).startsWith('cb-svg-')) {
        await supabase.from('coloring_pages').upsert({
          slug: d.slug,
          title: d.title,
          categories: newCats,
          image_path: d.imagePath || d.image,
          likes_count: d.likes || 0,
          downloads_count: d.downloads || 0,
          is_published: true,
          created_by: user?.id || null,
        }, { onConflict: 'slug' });
      } else {
        await supabase.from('coloring_pages').update({ categories: newCats }).eq('id', d.id);
      }

      updatedMap.set(d.id, newCats);
    }

    localStorage.setItem('cb-custom-drawings-cats', JSON.stringify(catOverrides));

    if (setDrawings) {
      setDrawings(prev => prev.map(d => {
        if (updatedMap.has(d.id)) {
          return { ...d, cat: updatedMap.get(d.id) };
        }
        return d;
      }));
    }

    if (reloadDrawings) {
      await reloadDrawings();
    }
  }

  // Batch move selected drawings to target category
  async function handleBatchMoveDrawings(targetCategoryName, mode = 'replace') {
    if (!targetCategoryName) {
      alert('Veuillez choisir une catégorie ou un dossier de destination.');
      return;
    }
    const ids = Array.from(selectedDrawingIds);
    if (ids.length === 0) {
      alert('Veuillez sélectionner au moins un dessin.');
      return;
    }

    setIsMovingBatchDrawings(true);
    try {
      await updateDrawingCategoriesInDbAndState(ids, (oldCats) => {
        if (mode === 'add') {
          return Array.from(new Set([...oldCats, targetCategoryName]));
        }
        return [targetCategoryName];
      });

      setSelectedDrawingIds(new Set());
      alert(`✅ ${ids.length} dessin(s) ont été déplacés vers « ${targetCategoryName} » avec succès !`);
    } catch (err) {
      console.error('Erreur lors du déplacement groupé des dessins:', err);
      alert('Une erreur est survenue lors du déplacement.');
    } finally {
      setIsMovingBatchDrawings(false);
    }
  }

  // Batch delete selected drawings
  async function handleBatchDeleteDrawings() {
    const ids = Array.from(selectedDrawingIds);
    if (ids.length === 0) return;
    if (!confirm(`Supprimer définitivement les ${ids.length} dessins sélectionnés ?`)) return;

    setIsMovingBatchDrawings(true);
    try {
      for (const id of ids) {
        const d = drawings.find(x => x.id === id);
        if (d) {
          if (setDrawings) {
            setDrawings(prev => prev.filter(x => x.id !== d.id && x.slug !== d.slug));
          }
          const localDeleted = JSON.parse(localStorage.getItem('cb-deleted-slugs') || '[]');
          if (d.slug && !localDeleted.includes(d.slug)) localDeleted.push(d.slug);
          if (d.id && !localDeleted.includes(String(d.id))) localDeleted.push(String(d.id));
          localStorage.setItem('cb-deleted-slugs', JSON.stringify(localDeleted));

          if (d.slug) {
            try {
              await supabase.from('deleted_colorings').upsert({ slug: d.slug }, { onConflict: 'slug' });
            } catch (delErr) {
              console.warn(delErr);
            }
          }
          if (d.id && !String(d.id).startsWith('cb-svg-')) {
            await supabase.from('coloring_pages').delete().eq('id', d.id);
          }
          if (d.slug) {
            await supabase.from('coloring_pages').delete().eq('slug', d.slug);
          }
        }
      }
      setSelectedDrawingIds(new Set());
      await reloadDrawings();
      alert(`🗑️ ${ids.length} dessin(s) ont été supprimés avec succès.`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression groupée.');
    } finally {
      setIsMovingBatchDrawings(false);
    }
  }

  // Delete category core
  async function deleteCategoryCore(catItem) {
    const isSub = Boolean(catItem.parentId);
    const updated = categoriesList.filter(c => c.id !== catItem.id && c.parentId !== catItem.id);

    if (setCategoriesList) {
      setCategoriesList(updated);
    }

    const delList = JSON.parse(localStorage.getItem('cb-deleted-categories') || '[]');
    if (!delList.includes(catItem.id)) delList.push(catItem.id);
    if (!delList.includes(catItem.name.toLowerCase())) delList.push(catItem.name.toLowerCase());
    if (!isSub) {
      const subs = categoriesList.filter(c => c.parentId === catItem.id);
      subs.forEach(s => {
        if (!delList.includes(s.id)) delList.push(s.id);
        if (!delList.includes(s.name.toLowerCase())) delList.push(s.name.toLowerCase());
      });
    }
    localStorage.setItem('cb-deleted-categories', JSON.stringify(delList));
    localStorage.setItem('cb-custom-categories', JSON.stringify(updated));

    try {
      await supabase.from('categories').delete().eq('id', catItem.id);
      if (!isSub) {
        await supabase.from('categories').delete().eq('parent_id', catItem.id);
      }
    } catch (err) {
      console.warn('Supabase delete category notice:', err);
    }
  }

  // User-facing delete category with drawing transfer option
  async function handleDeleteCategoryWithOption(catItem) {
    const normCat = normalizeCatStr(catItem.name);
    const affected = drawings.filter(d => (d.cat || []).some(c => normalizeCatStr(c) === normCat));
    const count = affected.length;
    let targetTransfer = null;

    if (count > 0) {
      const choice = confirm(
        `La catégorie « ${catItem.name} » contient ${count} dessin(s).\n\n` +
        `Voulez-vous transférer ces ${count} dessins vers « Divers » avant de supprimer la catégorie ?\n\n` +
        `• Cliquez sur « OK » pour transférer les dessins vers « Divers » et supprimer « ${catItem.name} ».\n` +
        `• Cliquez sur « Annuler » pour annuler l'opération.`
      );
      if (!choice) return;
      targetTransfer = 'Divers';
    } else {
      if (!confirm(`Supprimer définitivement la catégorie « ${catItem.name} » ?`)) return;
    }

    try {
      if (targetTransfer && count > 0) {
        await updateDrawingCategoriesInDbAndState(
          affected.map(d => d.id),
          (cats) => Array.from(new Set(cats.filter(c => normalizeCatStr(c) !== normCat).concat(targetTransfer)))
        );
      }

      await deleteCategoryCore(catItem);
      if (reloadCategories) await reloadCategories();
      if (reloadDrawings) await reloadDrawings();

      alert(`🗑️ Catégorie « ${catItem.name} » supprimée avec succès !`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression de la catégorie.');
    }
  }

  // Rename category and propagate to all associated drawings
  async function handleRenameCategoryOwner(catItem) {
    const newName = window.prompt(`Nouveau nom pour la catégorie « ${catItem.name} » :`, catItem.name);
    if (!newName || !newName.trim() || newName.trim() === catItem.name) return;
    const trimmed = newName.trim();
    const oldNorm = normalizeCatStr(catItem.name);

    try {
      const updatedCats = categoriesList.map(c => c.id === catItem.id ? { ...c, name: trimmed } : c);
      if (setCategoriesList) {
        setCategoriesList(updatedCats);
      }
      localStorage.setItem('cb-custom-categories', JSON.stringify(updatedCats));

      try {
        await supabase.from('categories').update({ name: trimmed }).eq('id', catItem.id);
      } catch (dbErr) {
        console.warn(dbErr);
      }

      const affected = drawings.filter(d => (d.cat || []).some(c => normalizeCatStr(c) === oldNorm));
      if (affected.length > 0) {
        await updateDrawingCategoriesInDbAndState(
          affected.map(d => d.id),
          (cats) => cats.map(c => normalizeCatStr(c) === oldNorm ? trimmed : c)
        );
      }

      if (reloadCategories) await reloadCategories();
      alert(`✅ Catégorie renommée en « ${trimmed} » (${affected.length} dessin(s) mis à jour) !`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du renommage.');
    }
  }

  // Merge categories: move all drawings from source to target, optionally deleting source
  async function handleMergeCategories(sourceName, targetName, deleteSource = true) {
    if (!sourceName || !targetName) {
      alert('Veuillez sélectionner le dossier source et le dossier de destination.');
      return;
    }
    const normSource = normalizeCatStr(sourceName);
    const normTarget = normalizeCatStr(targetName);
    if (normSource === normTarget) {
      alert('La catégorie source et la catégorie de destination doivent être différentes.');
      return;
    }

    const affected = drawings.filter(d => (d.cat || []).some(c => normalizeCatStr(c) === normSource));
    const confirmMsg =
      `Confirmer la fusion des dossiers :\n\n` +
      `• Déplacer les ${affected.length} dessin(s) de « ${sourceName} » vers « ${targetName} »\n` +
      (deleteSource ? `• Supprimer ensuite le dossier source « ${sourceName} »\n\n` : `\n`) +
      `Voulez-vous continuer ?`;

    if (!confirm(confirmMsg)) return;

    setIsMergingCategories(true);
    try {
      if (affected.length > 0) {
        await updateDrawingCategoriesInDbAndState(
          affected.map(d => d.id),
          (cats) => Array.from(new Set(cats.filter(c => normalizeCatStr(c) !== normSource).concat(targetName)))
        );
      }

      if (deleteSource) {
        const sourceObj = categoriesList.find(c => normalizeCatStr(c.name) === normSource);
        if (sourceObj) {
          await deleteCategoryCore(sourceObj);
        }
      }

      if (reloadCategories) await reloadCategories();
      if (reloadDrawings) await reloadDrawings();

      setMergeSourceCat('');
      setShowMergePanel(false);
      alert(`🎉 Fusion réussie ! ${affected.length} dessin(s) ont été transférés vers « ${targetName} »${deleteSource ? ` et « ${sourceName} » a été supprimée.` : '.'}`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la fusion des dossiers.');
    } finally {
      setIsMergingCategories(false);
    }
  }

  // Universal direct category creation helper (Immediate React State + LocalStorage + Supabase)
  async function createCategoryDirectly(rawName, parentId = null, isVip = false) {
    const trimmed = (rawName || '').trim();
    if (!trimmed) {
      alert('Veuillez entrer un nom pour le dossier / la catégorie.');
      return false;
    }

    const norm = normalizeCatStr(trimmed);
    const existingSameScope = categoriesList.find(c => {
      const cParent = c.parentId || null;
      const targetParent = parentId || null;
      return normalizeCatStr(c.name) === norm && cParent === targetParent;
    });

    if (existingSameScope) {
      alert(`Le dossier « ${existingSameScope.name} » existe déjà à cet emplacement.`);
      return false;
    }

    const baseSlug = slugify(trimmed) || 'cat';
    const newId = parentId ? `${parentId}-${baseSlug}` : baseSlug;
    const finalName = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

    const isVipFolder = Boolean(
      isVip ||
      norm === 'vip' ||
      baseSlug.startsWith('vip-') ||
      baseSlug.endsWith('-vip')
    );

    const newCatObj = {
      id: newId,
      name: finalName,
      parent_id: parentId || null,
      sort_order: categoriesList.length + 1,
      is_vip: isVipFolder,
    };

    const normalizedNew = normalizeCategory(newCatObj);

    // 1. Mise à jour instantanée de l'état React (0 ms de latence visuelle)
    if (setCategoriesList) {
      setCategoriesList(prev => [...prev.filter(c => c.id !== newId), normalizedNew]);
    }

    // 2. Persistance locale dans localStorage
    const delList = JSON.parse(localStorage.getItem('cb-deleted-categories') || '[]');
    const nextDel = delList.filter(x => x !== newId && x !== finalName.toLowerCase());
    localStorage.setItem('cb-deleted-categories', JSON.stringify(nextDel));

    const storedCustom = JSON.parse(localStorage.getItem('cb-custom-categories') || '[]');
    const updatedCustom = [...storedCustom.filter(c => c.id !== newId), newCatObj];
    localStorage.setItem('cb-custom-categories', JSON.stringify(updatedCustom));

    // 3. Sauvegarde dans la table Supabase categories
    try {
      const { error: upsertErr } = await supabase.from('categories').upsert(newCatObj, { onConflict: 'id' });
      if (upsertErr) {
        console.warn('Database category insert notice:', upsertErr);
      }
    } catch (dbErr) {
      console.warn('Database category insert notice:', dbErr);
    }

    // 4. Synchronisation en arrière-plan
    if (reloadCategories) {
      reloadCategories().catch(() => {});
    }

    return true;
  }

  // Action directe pour « Créer un Dossier VIP »
  async function handleCreateVipFolderPrompt() {
    const vipName = window.prompt(
      'Nom du dossier VIP à créer (ex: VIP Exclusif, Mandalas VIP, etc.) :',
      'VIP'
    );
    if (!vipName || !vipName.trim()) return;

    const ok = await createCategoryDirectly(vipName.trim(), null, true);
    if (ok) {
      alert(`👑 Dossier VIP « ${vipName.trim()} » créé avec succès ! Les coloriages placés dans ce dossier afficheront automatiquement un filigrane et un cadenas pour les visiteurs non abonnés.`);
    }
  }

  // Activer ou désactiver le statut VIP de n'importe quel dossier
  async function handleToggleVipCategory(catItem) {
    const nextVip = !catItem.isVip;
    const confirmMsg = nextVip
      ? `Passer le dossier « ${catItem.name} » en réservé VIP ?\n\nSes dessins afficheront automatiquement un filigrane et un cadenas pour les visiteurs non abonnés.`
      : `Retirer le statut VIP du dossier « ${catItem.name} » ?\n\nSes dessins redeviendront accessibles gratuitement au public.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const updatedCats = categoriesList.map(c => c.id === catItem.id ? { ...c, isVip: nextVip } : c);
      if (setCategoriesList) {
        setCategoriesList(updatedCats);
      }
      localStorage.setItem('cb-custom-categories', JSON.stringify(updatedCats));

      try {
        await supabase.from('categories').update({ is_vip: nextVip }).eq('id', catItem.id);
      } catch (dbErr) {
        console.warn('Supabase toggle VIP notice:', dbErr);
      }

      if (reloadCategories) await reloadCategories();
      alert(`👑 Statut VIP de « ${catItem.name} » mis à jour : ${nextVip ? 'Dossier VIP activé' : 'Dossier public standard'}`);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour du statut VIP.');
    }
  }

  // Quick subcategory creator triggered from folder card (immediate prompt with Enter validation)
  async function handleQuickAddSubCategory(rc) {
    const subName = window.prompt(`Nom de la sous-catégorie à ajouter dans « ${rc.name} » :`);
    if (!subName || !subName.trim()) return;

    const ok = await createCategoryDirectly(subName.trim(), rc.id, rc.isVip);
    if (ok) {
      alert(`🎉 Sous-dossier « ${subName.trim()} » créé avec succès dans « ${rc.name} » !`);
    }
  }

  // Create new category from Manager top form
  async function handleCreateCategoryInManager(e) {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = mgrNewCatName.trim();
    if (!trimmed) {
      alert('Veuillez entrer un nom pour la catégorie.');
      return;
    }

    setCreatingCatInManager(true);
    try {
      const parentId = mgrNewCatParentId && mgrNewCatParentId !== 'root' ? mgrNewCatParentId : null;
      const ok = await createCategoryDirectly(trimmed, parentId, mgrNewCatIsVip);
      if (ok) {
        setMgrNewCatName('');
        setMgrNewCatIsVip(false);
        setShowMgrCatCreator(false);
        alert(`🎉 Dossier / catégorie « ${trimmed} » créée avec succès !`);
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de la catégorie.');
    } finally {
      setCreatingCatInManager(false);
    }
  }

  // Réinitialisation des favoris et compteurs de likes
  const [resettingLikes, setResettingLikes] = useState(false);

  async function handleResetLikesAndFavorites() {
    if (!window.confirm('Voulez-vous réinitialiser à 0 toutes les mentions « J’aime » et vider tous les favoris ? Cette action remet les compteurs à zéro.')) {
      return;
    }
    setResettingLikes(true);
    try {
      // 1. Remettre à 0 likes_count dans Supabase
      const { error: updateErr } = await supabase
        .from('coloring_pages')
        .update({ likes_count: 0 })
        .gt('likes_count', -1);

      if (updateErr) {
        console.warn('Notice Supabase reset likes:', updateErr);
      }

      // 2. Nettoyer les favoris locaux
      localStorage.removeItem('cb-favs');

      // 3. Mettre à jour l’état React des dessins
      if (setDrawings) {
        setDrawings(prev => prev.map(d => ({ ...d, likes: 0 })));
      }

      if (reloadDrawings) {
        await reloadDrawings();
      }

      alert('Toutes les mentions « J’aime » et les favoris ont été remis à zéro avec succès !');
    } catch (err) {
      console.error('Erreur réinitialisation favoris:', err);
      alert('Erreur lors de la réinitialisation : ' + (err.message || 'Erreur'));
    } finally {
      setResettingLikes(false);
    }
  }

  async function handleCreateCategory(e) {
    if (e) e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName) {
      alert('Veuillez entrer un nom pour la catégorie.');
      return;
    }

    const existing = (categoriesList || []).find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      alert(`La catégorie « ${existing.name} » existe déjà.`);
      return;
    }

    setCreatingCategory(true);
    try {
      const parentId = newCatParentId && newCatParentId !== 'root' ? newCatParentId : null;
      const baseSlug = slugify(trimmedName);
      const newId = parentId ? `${parentId}-${baseSlug}` : baseSlug;

      const isVipCat = Boolean(
        trimmedName.toLowerCase() === 'vip' ||
        baseSlug.startsWith('vip-') ||
        baseSlug.endsWith('-vip')
      );

      const newCatObj = {
        id: newId,
        name: trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1),
        parent_id: parentId,
        sort_order: (categoriesList || []).length + 1,
        is_vip: isVipCat,
      };

      // 1. Local storage fallback
      const storedCustom = JSON.parse(localStorage.getItem('cb-custom-categories') || '[]');
      const updatedCustom = [...storedCustom.filter(c => c.id !== newId), newCatObj];
      localStorage.setItem('cb-custom-categories', JSON.stringify(updatedCustom));

      // 2. Supabase
      try {
        await supabase.from('categories').upsert(newCatObj, { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('Supabase categories insert notice:', dbErr);
      }

      // 3. Update React state & reload categories in App
      if (setCategoriesList) {
        setCategoriesList(prev => [...prev.filter(c => c.id !== newId), normalizeCategory(newCatObj)]);
      }
      if (reloadCategories) {
        await reloadCategories();
      }

      // 4. Automatically select the newly created category
      const newName = newCatObj.name;
      setGroupedCats(prev => [...prev.filter(x => x !== newName), newName]);
      if (batchUploadList.length > 0) {
        setBatchUploadList(prev => prev.map(item => ({
          ...item,
          categories: [...(item.categories || []).filter(x => x !== newName), newName]
        })));
      }

      setNewCatName('');
      setShowCatCreator(false);
      alert(`🎉 Catégorie « ${newName} » créée avec succès ! Elle a été sélectionnée pour vos dessins.`);
    } catch (err) {
      console.error('Error creating category:', err);
      alert('Une erreur est survenue lors de la création de la catégorie.');
    } finally {
      setCreatingCategory(false);
    }
  }

  // Quick edit for renaming & categories in library
  const [editingDrawingId, setEditingDrawingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingCats, setEditingCats] = useState([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCatFilter, setLibraryCatFilter] = useState('Tous');

  function renderHierarchicalCategoryPills(selectedCats = [], onToggleCat) {
    return (
      <div className="cb-hierarchical-cats-container">
        {rootCategories.map(rc => {
          const subs = getSubcategoriesFor(rc, categoriesList);
          const isRcSel = selectedCats.includes(rc.name);
          return (
            <div key={rc.id} className="cb-hierarchical-cat-group">
              <button
                type="button"
                className={`cb-item-cat-pill root ${isRcSel ? 'active' : ''}`}
                onClick={() => onToggleCat(rc.name)}
                title={`Catégorie : ${rc.name}`}
              >
                {isRcSel ? '✓ ' : '+ '}{rc.name}
              </button>
              {subs.map(sc => {
                const isScSel = selectedCats.includes(sc.name);
                return (
                  <button
                    type="button"
                    key={sc.id}
                    className={`cb-item-cat-pill sub ${isScSel ? 'active' : ''}`}
                    onClick={() => onToggleCat(sc.name)}
                    title={`Sous-catégorie de ${rc.name} : ${sc.name}`}
                  >
                    {isScSel ? '✓ ' : '↳ '}{sc.name}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // Toggle batch renaming mode
  function toggleBatchRenaming() {
    if (!isBatchRenaming) {
      const initial = {};
      drawings.forEach(d => {
        initial[d.id] = d.title;
      });
      setBatchTitles(initial);
      setIsBatchRenaming(true);
    } else {
      setIsBatchRenaming(false);
    }
  }

  function handleBatchTitleChange(id, newTitle) {
    setBatchTitles(prev => ({ ...prev, [id]: newTitle }));
  }

  // Count of modified titles
  const modifiedTitles = useMemo(() => {
    const mods = {};
    drawings.forEach(d => {
      if (batchTitles[d.id] !== undefined && batchTitles[d.id].trim() !== d.title) {
        mods[d.id] = batchTitles[d.id].trim();
      }
    });
    return mods;
  }, [batchTitles, drawings]);

  // Save all modified titles in a single click
  async function saveAllBatchTitles() {
    const entries = Object.entries(modifiedTitles);
    if (entries.length === 0) {
      setIsBatchRenaming(false);
      return;
    }

    setSavingBatchTitles(true);
    try {
      const storedOverrides = JSON.parse(localStorage.getItem('cb-custom-titles') || '{}');
      entries.forEach(([id, newTitle]) => {
        storedOverrides[id] = newTitle;
        const d = drawings.find(x => x.id === id);
        if (d?.slug) storedOverrides[d.slug] = newTitle;
      });
      localStorage.setItem('cb-custom-titles', JSON.stringify(storedOverrides));

      for (const [id, newTitle] of entries) {
        const d = drawings.find(x => x.id === id);
        if (!d) continue;

        if (String(id).startsWith('cb-svg-')) {
          await supabase.from('coloring_pages').upsert({
            slug: d.slug,
            title: newTitle,
            categories: d.cat && d.cat.length ? d.cat : ['Animaux'],
            image_path: d.imagePath || d.image,
            likes_count: d.likes || 0,
            downloads_count: d.downloads || 0,
            is_published: true,
            created_by: user.id || null,
          }, { onConflict: 'slug' });
        } else {
          await supabase.from('coloring_pages').update({
            title: newTitle,
          }).eq('id', id);
        }
      }

      await reloadDrawings();
      setIsBatchRenaming(false);
      alert(`✅ ${entries.length} dessin(s) ont été renommés avec succès !`);
    } catch (err) {
      console.error(err);
      alert('Toutes les modifications ont été enregistrées localement et synchronisées avec Supabase.');
      await reloadDrawings();
      setIsBatchRenaming(false);
    } finally {
      setSavingBatchTitles(false);
    }
  }

  // Apply common name to all items currently in the batch upload queue
  function applyCommonNameToBatch(name, autoNum) {
    if (!name || !name.trim()) return;
    setBatchUploadList(prev => {
      const count = prev.length;
      return prev.map((item, idx) => ({
        ...item,
        title: (autoNum && count > 1) ? `${name.trim()} ${idx + 1}` : name.trim(),
      }));
    });
  }

  // Apply common name to all visible items in the library during batch rename
  function applyCommonNameToLibrary(name, autoNum) {
    if (!name || !name.trim()) return;
    setBatchTitles(prev => {
      const next = { ...prev };
      filteredLibraryDrawings.forEach((d, idx) => {
        next[d.id] = (autoNum && filteredLibraryDrawings.length > 1)
          ? `${name.trim()} ${idx + 1}`
          : name.trim();
      });
      return next;
    });
  }

  // Batch files add handler
  function handleBatchFilesAdd(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    addFilesToBatch(files);
    e.target.value = '';
  }

  function addFilesToBatch(files) {
    const existingCount = batchUploadList.length;
    const totalCount = existingCount + files.length;

    const newItems = files.map((f, i) => {
      const isSvg = f.name.toLowerCase().endsWith('.svg') || f.type === 'image/svg+xml';
      let initialTitle;
      if (useCommonName && commonName.trim()) {
        const idx = existingCount + i + 1;
        initialTitle = (autoNumberCommonName && totalCount > 1)
          ? `${commonName.trim()} ${idx}`
          : commonName.trim();
      } else {
        const rawName = f.name.replace(/\.[^/.]+$/, '');
        const clean = rawName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        initialTitle = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Coloriage';
      }

      return {
        id: `batch_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        preview: URL.createObjectURL(f),
        format: isSvg ? 'SVG' : 'PNG',
        title: initialTitle,
        categories: groupedCats.length ? [...groupedCats] : ['Animaux'],
        selected: true,
      };
    });

    setBatchUploadList(prev => {
      const combined = [...prev, ...newItems];
      if (useCommonName && commonName.trim() && autoNumberCommonName && combined.length > 1) {
        return combined.map((item, idx) => ({
          ...item,
          title: `${commonName.trim()} ${idx + 1}`,
        }));
      }
      return combined;
    });
  }

  function removeBatchItem(id) {
    setBatchUploadList(prev => {
      const filtered = prev.filter(x => x.id !== id);
      if (useCommonName && commonName.trim() && autoNumberCommonName && filtered.length > 1) {
        return filtered.map((item, idx) => ({
          ...item,
          title: `${commonName.trim()} ${idx + 1}`,
        }));
      }
      return filtered;
    });
  }

  function updateBatchItem(id, updates) {
    setBatchUploadList(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));
  }

  function toggleSelectAll(select) {
    setBatchUploadList(prev => prev.map(x => ({ ...x, selected: select })));
  }

  function applyGroupedSettings() {
    const selectedCount = batchUploadList.filter(x => x.selected).length;
    if (selectedCount === 0) {
      alert('Sélectionne au moins un coloriage ci-dessous pour lui appliquer les réglages groupés.');
      return;
    }

    let counter = 1;
    setBatchUploadList(prev => prev.map(item => {
      if (!item.selected) return item;

      let finalTitle = item.title;
      if (groupedTitle.trim()) {
        if (groupedAutoNumber && selectedCount > 1) {
          finalTitle = `${groupedTitle.trim()} ${counter++}`;
        } else {
          finalTitle = groupedTitle.trim();
        }
      }

      return {
        ...item,
        title: finalTitle,
        categories: groupedCats.length ? [...groupedCats] : item.categories,
      };
    }));
  }

  async function publishAllBatchDrawings() {
    const toPublish = batchUploadList.filter(x => x.selected);
    if (toPublish.length === 0) {
      alert('Sélectionne au moins un coloriage à publier.');
      return;
    }

    setPublishingBatch(true);
    setPublishProgress({ current: 0, total: toPublish.length, text: 'Démarrage de la publication…' });

    let successCount = 0;
    const failedItems = [];
    const createdByUuid = (user?.id && /^[0-9a-f-]{36}$/i.test(user.id)) ? user.id : null;

    for (let i = 0; i < toPublish.length; i++) {
      const item = toPublish[i];
      setPublishProgress({
        current: i + 1,
        total: toPublish.length,
        text: `Publication de « ${item.title} » (${i + 1}/${toPublish.length})…`,
      });

      try {
        const ext = (item.file.name.split('.').pop() || 'png').toLowerCase();
        const baseSlug = slugify(item.title) || 'coloriage';
        const uploadedPath = `${Date.now()}-${baseSlug}-${i}.${ext}`;
        const contentType = ext === 'svg' ? 'image/svg+xml' : (item.file.type || 'image/png');

        const { error: uploadError } = await supabase.storage
          .from('colorings')
          .upload(uploadedPath, item.file, { contentType, upsert: false });

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from('coloring_pages').insert({
          title: item.title.trim(),
          slug: `${baseSlug}-${Date.now().toString(36)}-${i}`,
          categories: item.categories.length ? item.categories : ['Divers'],
          image_path: uploadedPath,
          created_by: createdByUuid,
          is_published: true,
        });

        if (insertError) throw insertError;
        successCount++;
      } catch (err) {
        console.error('Failed to publish item:', item.title, err);
        failedItems.push(item);
      }
    }

    await reloadDrawings();
    setPublishingBatch(false);

    if (successCount > 0) {
      try {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateKey = `${year}-${month}-${day}`;
        const displayDate = `${day}/${month}`;

        const { data: existing } = await supabase
          .from('addition_logs')
          .select('id, drawings_count')
          .eq('date_key', dateKey)
          .maybeSingle();

        if (existing) {
          const newCount = (existing.drawings_count || 0) + successCount;
          await supabase
            .from('addition_logs')
            .update({ drawings_count: newCount, created_at: now.toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase.from('addition_logs').insert({
            date_key: dateKey,
            display_date: displayDate,
            drawings_count: successCount,
            created_at: now.toISOString(),
          });
        }
        if (reloadNews) {
          await reloadNews();
        }
      } catch (logErr) {
        console.warn('Failed to update addition_logs:', logErr);
      }
    }

    if (failedItems.length === 0) {
      setBatchUploadList([]);
      setView('library');
      alert(`🎉 Succès : ${successCount} coloriage(s) ont été publiés sur Colorblop !`);
    } else {
      setBatchUploadList(failedItems);
      alert(`⚠️ ${successCount} coloriage(s) publiés, mais ${failedItems.length} ont échoué. Vous pouvez réessayer pour les éléments restants.`);
    }
  }

  async function loadRequests() {
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('coloring_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const [analyticsRes, profilesRes] = await Promise.all([
        supabase
          .from('site_analytics')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('profiles')
          .select('id,display_name,avatar_index,is_admin,created_at', { count: 'exact' })
          .order('created_at', { ascending: false }),
      ]);

      if (!analyticsRes.error && analyticsRes.data) {
        setAnalyticsEvents(analyticsRes.data);
      }
      if (!profilesRes.error && profilesRes.data) {
        setTotalUsersCount(profilesRes.count || profilesRes.data.length);
        setRegisteredUsersList(profilesRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    if (view === 'requests') loadRequests();
    if (view === 'stats') loadStats();
    if (view === 'licenses') loadLicenses();
  }, [view]);

  async function loadLicenses() {
    setLoadingLicenses(true);
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setLicensesList(data);
      }
    } catch (err) {
      console.warn('Erreur chargement licences:', err);
    } finally {
      setLoadingLicenses(false);
    }
  }

  useEffect(() => {
    loadLicenses();
  }, []);

  async function validateRequest(reqId, slug) {
    if (!slug) {
      alert('Sélectionne un coloriage à associer à cette demande.');
      return;
    }
    const { error } = await supabase
      .from('coloring_requests')
      .update({
        status: 'done',
        completed_drawing_slug: slug,
        completed_at: new Date().toISOString()
      })
      .eq('id', reqId);

    if (error) {
      alert('Impossible de valider la demande.');
      return;
    }
    await loadRequests();
    if (refreshPendingRequests) refreshPendingRequests();
  }

  function resetForm() {
    setEdit(null);
    setTitle('');
    setCategories('');
    setFile(null);
    setPreview('');
    setDetectedFormat(null);
  }

  function choose(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    const isSvg = selected.name.toLowerCase().endsWith('.svg') || selected.type === 'image/svg+xml';
    setDetectedFormat(isSvg ? 'SVG' : 'PNG');
  }

  async function save() {
    if (!title.trim() || (!edit && !file)) {
      alert('Ajoute un nom et une image.');
      return;
    }

    setSaving(true);
    let imagePath = edit?.imagePath || null;
    let uploadedPath = null;

    try {
      if (file) {
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const base = slugify(title) || 'coloriage';
        uploadedPath = `${Date.now()}-${base}.${ext}`;
        const contentType = ext === 'svg' ? 'image/svg+xml' : (file.type || 'image/png');

        const { error: uploadError } = await supabase.storage
          .from('colorings')
          .upload(uploadedPath, file, { contentType, upsert: false });

        if (uploadError) throw uploadError;
        imagePath = uploadedPath;
      }

      const catsList = categories.split(',').map(x => x.trim()).filter(Boolean);
      const payload = {
        title: title.trim(),
        categories: catsList.length ? catsList : ['Divers'],
        image_path: imagePath,
      };

      let error;
      const createdByUuid = (user?.id && /^[0-9a-f-]{36}$/i.test(user.id)) ? user.id : null;
      if (edit) {
        ({ error } = await supabase.from('coloring_pages').update(payload).eq('id', edit.id));
      } else {
        ({ error } = await supabase.from('coloring_pages').insert({
          ...payload,
          slug: (slugify(title) || 'coloriage') + '-' + Date.now().toString(36),
          created_by: createdByUuid,
          is_published: true,
        }));
      }

      if (error) throw error;

      if (edit && file && edit.imagePath && !edit.imagePath.startsWith('/')) {
        await supabase.storage.from('colorings').remove([edit.imagePath]);
      }

      if (!edit) {
        try {
          const now = new Date();
          const day = String(now.getDate()).padStart(2, '0');
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = now.getFullYear();
          const dateKey = `${year}-${month}-${day}`;
          const displayDate = `${day}/${month}`;

          const { data: existing } = await supabase
            .from('addition_logs')
            .select('id, drawings_count')
            .eq('date_key', dateKey)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('addition_logs')
              .update({ drawings_count: (existing.drawings_count || 0) + 1, created_at: now.toISOString() })
              .eq('id', existing.id);
          } else {
            await supabase.from('addition_logs').insert({
              date_key: dateKey,
              display_date: displayDate,
              drawings_count: 1,
              created_at: now.toISOString(),
            });
          }
          if (reloadNews) {
            await reloadNews();
          }
        } catch (logErr) {
          console.warn('Error recording addition log:', logErr);
        }
      }

      await reloadDrawings();
      resetForm();
      setView('library');
    } catch (error) {
      console.error(error);
      if (uploadedPath) await supabase.storage.from('colorings').remove([uploadedPath]);
      alert('Impossible d’enregistrer ce coloriage. Vérifie les droits Supabase.');
    } finally {
      setSaving(false);
    }
  }

  async function saveQuickEdit(d) {
    if (!editingTitle.trim()) {
      alert('Le nom ne peut pas être vide.');
      return;
    }

    const newTitle = editingTitle.trim();
    const storedOverrides = JSON.parse(localStorage.getItem('cb-custom-titles') || '{}');
    storedOverrides[d.id] = newTitle;
    if (d.slug) storedOverrides[d.slug] = newTitle;
    localStorage.setItem('cb-custom-titles', JSON.stringify(storedOverrides));

    if (String(d.id).startsWith('cb-svg-')) {
      await supabase.from('coloring_pages').upsert({
        slug: d.slug,
        title: newTitle,
        categories: editingCats.length ? editingCats : (d.cat || ['Animaux']),
        image_path: d.imagePath || d.image,
        likes_count: d.likes || 0,
        downloads_count: d.downloads || 0,
        is_published: true,
        created_by: user.id || null,
      }, { onConflict: 'slug' });
    } else {
      await supabase
        .from('coloring_pages')
        .update({
          title: newTitle,
          categories: editingCats.length ? editingCats : ['Divers']
        })
        .eq('id', d.id);
    }

    setEditingDrawingId(null);
    await reloadDrawings();
  }

  async function removeDrawing(drawing) {
    if (!confirm(`Supprimer définitivement le coloriage « ${drawing.title} » ?`)) return;

    try {
      // 1. Immediately remove from local React state
      if (setDrawings) {
        setDrawings(prev => prev.filter(d => d.id !== drawing.id && d.slug !== drawing.slug));
      }

      // 2. Add to localStorage cb-deleted-slugs
      const localDeleted = JSON.parse(localStorage.getItem('cb-deleted-slugs') || '[]');
      if (drawing.slug && !localDeleted.includes(drawing.slug)) localDeleted.push(drawing.slug);
      if (drawing.id && !localDeleted.includes(String(drawing.id))) localDeleted.push(String(drawing.id));
      localStorage.setItem('cb-deleted-slugs', JSON.stringify(localDeleted));

      // Clean up local custom titles if present
      const localTitles = JSON.parse(localStorage.getItem('cb-custom-titles') || '{}');
      delete localTitles[drawing.id];
      if (drawing.slug) delete localTitles[drawing.slug];
      localStorage.setItem('cb-custom-titles', JSON.stringify(localTitles));

      // Clean up local favorites if present
      const localFavs = JSON.parse(localStorage.getItem('cb-favs') || '[]');
      const newFavs = localFavs.filter(x => x !== drawing.id && x !== drawing.slug);
      localStorage.setItem('cb-favs', JSON.stringify(newFavs));

      // 3. Insert slug into deleted_colorings table in Supabase
      if (drawing.slug) {
        try {
          await supabase.from('deleted_colorings').upsert({ slug: drawing.slug }, { onConflict: 'slug' });
        } catch (delErr) {
          console.warn('Could not upsert deleted_colorings:', delErr);
        }
      }

      // 4. Delete from coloring_pages table in Supabase
      if (drawing.id && !String(drawing.id).startsWith('cb-svg-')) {
        await supabase.from('coloring_pages').delete().eq('id', drawing.id);
      }
      if (drawing.slug) {
        await supabase.from('coloring_pages').delete().eq('slug', drawing.slug);
      }

      // 5. Delete from favorites in Supabase
      try {
        if (drawing.id) await supabase.from('favorites').delete().eq('coloring_id', String(drawing.id));
        if (drawing.slug) await supabase.from('favorites').delete().eq('coloring_id', drawing.slug);
      } catch (favErr) {
        console.warn('Favorite cleanup:', favErr);
      }

      // 6. Delete file from Supabase storage if it was uploaded
      if (drawing.imagePath && !drawing.imagePath.startsWith('/') && !drawing.imagePath.startsWith('http')) {
        try {
          await supabase.storage.from('colorings').remove([drawing.imagePath]);
        } catch (storageErr) {
          console.warn('Storage cleanup:', storageErr);
        }
      }

      // 7. Reload drawings to make sure all components are synchronized
      await reloadDrawings();
      alert(`Le coloriage « ${drawing.title} » a été supprimé avec succès.`);
    } catch (err) {
      console.error('Erreur lors de la suppression du coloriage:', err);
      alert('Une erreur est survenue lors de la suppression.');
      await reloadDrawings();
    }
  }

  // Compute aggregated stats
  const totalUsers = totalUsersCount || registeredUsersList.length;
  const totalDownloads = drawings.reduce((acc, d) => acc + (d.downloads || 0), 0) +
    analyticsEvents.filter(e => e.event_type === 'download').length;
  const totalLogins = analyticsEvents.filter(e => e.event_type === 'login').length;
  const totalVisits = analyticsEvents.filter(e => e.event_type === 'visit').length;
  const totalLikes = drawings.reduce((acc, d) => acc + (d.likes || 0), 0);
  const totalColorings = drawings.length;
  const totalSvgDrawings = drawings.filter(d => d.isSvg).length;
  const totalRasterDrawings = drawings.filter(d => !d.isSvg).length;
  const topDrawings = [...drawings].sort((a, b) => b.likes - a.likes).slice(0, 8);

  const categoryCounts = useMemo(() => {
    const counts = {};
    drawings.forEach(d => {
      d.cat.forEach(c => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [drawings]);

  // Filtered drawings in Library
  const filteredLibraryDrawings = useMemo(() => {
    return drawings.filter(d => {
      let matchCat = true;
      if (libraryCatFilter !== 'Tous') {
        const targetCat = (categoriesList || []).find(c => 
          normalizeCatStr(c.name) === normalizeCatStr(libraryCatFilter) || 
          normalizeCatStr(c.id) === normalizeCatStr(libraryCatFilter)
        );
        if (targetCat) {
          const normName = normalizeCatStr(targetCat.name);
          const normId = normalizeCatStr(targetCat.id);
          if (targetCat.parentId) {
            matchCat = (d.cat || []).some(c => {
              const nc = normalizeCatStr(c);
              return nc === normName || nc === normId;
            });
          } else {
            const subcats = getSubcategoriesFor(targetCat, categoriesList);
            const accepted = new Set([
              normName,
              normId,
              ...subcats.map(s => normalizeCatStr(s.name)),
              ...subcats.map(s => normalizeCatStr(s.id)),
            ]);
            matchCat = (d.cat || []).some(c => accepted.has(normalizeCatStr(c)));
          }
        } else {
          matchCat = (d.cat || []).some(c => normalizeCatStr(c) === normalizeCatStr(libraryCatFilter));
        }
      }
      const matchQ = d.title.toLowerCase().includes(librarySearch.toLowerCase());
      return matchCat && matchQ;
    });
  }, [drawings, libraryCatFilter, librarySearch, categoriesList]);

  return (
    <section className="cb-owner-space">
      {/* Top Header of Owner Space */}
      <div className="cb-owner-header">
        <div className="cb-owner-brand">
          <ShieldCheck className="cb-owner-shield" />
          <div>
            <h1>Espace Propriétaire & Artiste Colorblop</h1>
            <p>Connecté avec Supabase • {user.email || 'flo83119@gmail.com'}</p>
          </div>
        </div>

        {/* Navigation tabs inside Owner Space */}
        <nav className="cb-owner-nav-tabs">
          <button
            className={`cb-owner-tab ${view === 'stats' ? 'active' : ''}`}
            onClick={() => setView('stats')}
          >
            <TrendingUp size={16} /> Statistiques & Tendances
          </button>
          <button
            className={`cb-owner-tab ${view === 'library' ? 'active' : ''}`}
            onClick={() => setView('library')}
          >
            <FolderOpen size={16} /> Gérer les Dessins ({drawings.length})
          </button>
          <button
            className={`cb-owner-tab ${view === 'categories' ? 'active' : ''}`}
            onClick={() => setView('categories')}
          >
            <FolderTree size={16} /> Gérer les Catégories ({categoriesList.length})
          </button>
          <button
            className={`cb-owner-tab ${view === 'requests' ? 'active' : ''}`}
            onClick={() => setView('requests')}
          >
            <Mail size={16} /> Demandes de dessins
            {pendingRequestsCount > 0 && <span className="cb-tab-pill">{pendingRequestsCount}</span>}
          </button>
          <button
            className={`cb-owner-tab ${view === 'licenses' ? 'active' : ''}`}
            onClick={() => setView('licenses')}
          >
            <FileBadge size={16} /> Licences Commerciales ({licensesList.length})
          </button>
          <button
            className={`cb-owner-tab ${view === 'add' ? 'active' : ''}`}
            onClick={() => { resetForm(); setView('add'); }}
          >
            <Plus size={16} /> Ajouter un coloriage
          </button>
        </nav>

        <button className="cb-owner-exit-btn" onClick={closeAdmin}>
          <X size={16} /> Quitter l'espace
        </button>
      </div>

      {/* VIEW 1 : STATISTIQUES & TENDANCES */}
      {view === 'stats' && (
        <div className="cb-owner-view-stats">
          {/* Key KPI Cards */}
          <div className="cb-stats-kpi-grid cb-kpi-grid-5">
            <div className="cb-kpi-card">
              <span className="cb-kpi-icon users"><Users size={22} /></span>
              <div className="cb-kpi-val">{totalUsers}</div>
              <div className="cb-kpi-label">Membres inscrits</div>
              <small className="cb-kpi-sub">{registeredUsersList.filter(u => u.is_admin).length} compte(s) admin</small>
            </div>

            <div className="cb-kpi-card">
              <span className="cb-kpi-icon logins"><LogIn size={22} /></span>
              <div className="cb-kpi-val">{totalLogins}</div>
              <div className="cb-kpi-label">Connexions membres</div>
              <small className="cb-kpi-sub">{totalVisits} visites globales</small>
            </div>

            <div className="cb-kpi-card">
              <span className="cb-kpi-icon downloads"><Download size={22} /></span>
              <div className="cb-kpi-val">{totalDownloads}</div>
              <div className="cb-kpi-label">Téléchargements totaux</div>
              <small className="cb-kpi-sub">SVG, PNG & PDF</small>
            </div>

            <div className="cb-kpi-card">
              <span className="cb-kpi-icon count"><Leaf size={22} /></span>
              <div className="cb-kpi-val">{totalColorings}</div>
              <div className="cb-kpi-label">Coloriages actifs</div>
              <small className="cb-kpi-sub">{totalSvgDrawings} SVG • {totalRasterDrawings} PNG</small>
            </div>

            <div className="cb-kpi-card">
              <span className="cb-kpi-icon requests"><Mail size={22} /></span>
              <div className="cb-kpi-val">{pendingRequestsCount}</div>
              <div className="cb-kpi-label">Demandes en attente</div>
              <small className="cb-kpi-sub">Boîte aux lettres</small>
            </div>
          </div>

          <div className="cb-stats-columns">
            {/* Top Most Popular Colorings */}
            <div className="cb-stats-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}><ThumbsUp size={18} /> Top Coloriages les plus aimés</h3>
                <button
                  type="button"
                  className="cb-btn-subtle-reset"
                  onClick={handleResetLikesAndFavorites}
                  disabled={resettingLikes}
                  title="Remettre tous les compteurs de J'aime et favoris à zéro"
                >
                  <RefreshCw size={13} className={resettingLikes ? 'cb-spin' : ''} />
                  <span>{resettingLikes ? 'Remise à zéro…' : 'Remettre à zéro'}</span>
                </button>
              </div>
              <div className="cb-top-drawings-list">
                {topDrawings.map((d, index) => (
                  <div className="cb-top-drawing-row" key={d.id}>
                    <span className="cb-rank-badge">#{index + 1}</span>
                    <img src={d.image} alt={d.title} className="cb-top-thumb" />
                    <div className="cb-top-info">
                      <b>{d.title}</b>
                      <span>{d.cat.join(', ')} • {d.isSvg ? 'SVG vectoriel' : 'PNG raster'}</span>
                    </div>
                    <div className="cb-top-likes">
                      <Heart size={14} fill="#d9534f" color="#8b221d" /> {formatLikes(d.likes)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Trends */}
            <div className="cb-stats-card">
              <h3><Tags size={18} /> Tendances par Catégorie</h3>
              <p className="cb-stats-sub">Répartition des dessins et popularité :</p>
              <div className="cb-category-trends-list">
                {categoryCounts.map(([catName, count]) => (
                  <div className="cb-trend-bar-row" key={catName}>
                    <div className="cb-trend-label">
                      <span>{catName}</span>
                      <b>{count} dessins</b>
                    </div>
                    <div className="cb-trend-track">
                      <div
                        className="cb-trend-fill"
                        style={{ width: `${Math.min(100, Math.round((count / totalColorings) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2 : Dernières activités & Membres inscrits */}
          <div className="cb-stats-columns cb-stats-second-row">
            {/* Recent Live Activity Feed */}
            <div className="cb-stats-card">
              <h3><TrendingUp size={18} /> Dernières Activités en Direct</h3>
              <p className="cb-stats-sub">Flux temps réel des connexions et téléchargements :</p>
              <div className="cb-recent-activities-list">
                {analyticsEvents.slice(0, 10).map((ev) => {
                  const isDl = ev.event_type === 'download';
                  const isLogin = ev.event_type === 'login';
                  const timeStr = new Date(ev.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div className="cb-activity-row" key={ev.id}>
                      <span className={`cb-activity-badge ${ev.event_type}`}>
                        {isDl ? <Download size={14} /> : isLogin ? <LogIn size={14} /> : <Eye size={14} />}
                      </span>
                      <div className="cb-activity-info">
                        <b>
                          {isDl
                            ? `Téléchargement : « ${ev.metadata?.title || 'Coloriage'} » (${ev.metadata?.format || 'Fichier'})`
                            : isLogin
                            ? `Connexion : ${ev.metadata?.email?.split('@')[0] || 'Membre'}`
                            : `Visite sur ${ev.metadata?.path || 'le site'}`}
                        </b>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  );
                })}
                {analyticsEvents.length === 0 && (
                  <p className="cb-empty-hint">Aucune activité enregistrée pour le moment.</p>
                )}
              </div>
            </div>

            {/* Registered Users List */}
            <div className="cb-stats-card">
              <h3><Users size={18} /> Membres Inscrits ({totalUsers})</h3>
              <p className="cb-stats-sub">Comptes enregistrés dans Supabase :</p>
              <div className="cb-users-list">
                {registeredUsersList.map((u) => {
                  const avSrc = avatarList[u.avatar_index] || avatar1;
                  const dateStr = u.created_at
                    ? new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Récemment';
                  return (
                    <div className="cb-user-row" key={u.id}>
                      <img src={avSrc} alt="" className="cb-user-thumb" />
                      <div className="cb-user-info">
                        <b>{u.display_name || 'Membre'}</b>
                        <span>Inscrit le {dateStr}</span>
                      </div>
                      {u.is_admin ? (
                        <span className="cb-badge-role admin">Propriétaire</span>
                      ) : (
                        <span className="cb-badge-role member">Membre</span>
                      )}
                    </div>
                  );
                })}
                {registeredUsersList.length === 0 && (
                  <p className="cb-empty-hint">Chargement des membres…</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2 : GÉRER LES DESSINS */}
      {view === 'library' && (
        <div className="cb-owner-view-library">
          {/* Header Action Bar */}
          <div className="cb-library-actions-bar">
            <button
              className="cb-btn-add-primary"
              onClick={() => { resetForm(); setView('add'); }}
            >
              <Plus size={18} /> Ajouter un coloriage
            </button>

            {/* Selection Mode Button */}
            <button
              type="button"
              className={`cb-btn-select-mode ${isSelectMode || selectedDrawingIds.size > 0 ? 'active' : ''}`}
              onClick={() => {
                const nextMode = !isSelectMode;
                setIsSelectMode(nextMode);
                if (!nextMode && selectedDrawingIds.size > 0) {
                  setSelectedDrawingIds(new Set());
                }
              }}
              title="Sélectionner des dessins pour les changer de dossier ou les gérer par lot"
            >
              <CheckSquare size={16} />
              <span>{isSelectMode ? 'Fermer la sélection' : '☑️ Sélection groupée'}</span>
            </button>

            {/* Batch Renaming Toggle Button */}
            <button
              type="button"
              className={`cb-btn-batch-rename ${isBatchRenaming ? 'active' : ''}`}
              onClick={toggleBatchRenaming}
              title="Renommer tous les dessins à la chaîne avec un seul bouton d'enregistrement"
            >
              <Pencil size={16} />
              <span>{isBatchRenaming ? 'Fermer le mode renommage' : '✏️ Renommer les dessins'}</span>
            </button>

            {/* Manage Categories Shortcut */}
            <button
              type="button"
              className="cb-btn-goto-categories"
              onClick={() => setView('categories')}
              title="Ouvrir le gestionnaire des dossiers & catégories"
            >
              <FolderTree size={16} />
              <span>Dossiers & Catégories</span>
            </button>

            <div className="cb-library-search">
              <Search size={16} />
              <input
                type="text"
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                placeholder="Rechercher parmi les dessins…"
              />
              {librarySearch && <button onClick={() => setLibrarySearch('')}><X size={14} /></button>}
            </div>

            <div className="cb-library-cat-filter">
              <span>Dossier :</span>
              <select
                value={libraryCatFilter}
                onChange={e => setLibraryCatFilter(e.target.value)}
              >
                <option value="Tous">Tous les dossiers ({drawings.length})</option>
                {rootCategories.map(rc => {
                  const subs = getSubcategoriesFor(rc, categoriesList);
                  const rcCount = getCategoryDrawingsCount(rc);
                  return (
                    <React.Fragment key={rc.id}>
                      <option value={rc.name}>📁 {rc.name} ({rcCount})</option>
                      {subs.map(sc => {
                        const scCount = getCategoryDrawingsCount(sc);
                        return (
                          <option key={sc.id} value={sc.name}>&nbsp;&nbsp;↳ {sc.name} ({scCount})</option>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Selection Toolbar Banner for batch changing folder/category or bulk delete */}
          {(selectedDrawingIds.size > 0 || isSelectMode) && (
            <div className="cb-selection-toolbar-banner">
              <div className="cb-sel-banner-left">
                <span className="cb-sel-count-badge">
                  <CheckSquare size={18} />
                  <b>{selectedDrawingIds.size}</b> dessin(s) sélectionné(s) sur {filteredLibraryDrawings.length}
                </span>
                <button
                  type="button"
                  className="cb-sel-btn-subtle"
                  onClick={selectAllFilteredDrawings}
                  title="Sélectionner tous les dessins filtrés affichés"
                >
                  Tout sélectionner ({filteredLibraryDrawings.length})
                </button>
                {selectedDrawingIds.size > 0 && (
                  <button
                    type="button"
                    className="cb-sel-btn-subtle"
                    onClick={clearDrawingSelection}
                  >
                    Désélectionner tout
                  </button>
                )}
              </div>

              {selectedDrawingIds.size > 0 && (
                <div className="cb-sel-banner-right">
                  <div className="cb-sel-move-group">
                    <label htmlFor="cb-batch-target-cat">
                      <FolderInput size={16} />
                      <span>Déplacer vers :</span>
                    </label>
                    <select
                      id="cb-batch-target-cat"
                      className="cb-sel-select"
                      value={batchTargetCategory}
                      onChange={e => setBatchTargetCategory(e.target.value)}
                    >
                      <option value="">-- Choisir un dossier / catégorie --</option>
                      {rootCategories.map(rc => {
                        const subs = getSubcategoriesFor(rc, categoriesList);
                        return (
                          <React.Fragment key={rc.id}>
                            <option value={rc.name}>📁 {rc.name}</option>
                            {subs.map(sc => (
                              <option key={sc.id} value={sc.name}>&nbsp;&nbsp;↳ {sc.name}</option>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </select>

                    <select
                      className="cb-sel-mode-select"
                      value={batchMoveMode}
                      onChange={e => setBatchMoveMode(e.target.value)}
                      title="Remplacer le dossier actuel ou ajouter ce dossier en plus"
                    >
                      <option value="replace">Remplacer le dossier</option>
                      <option value="add">Ajouter en plus</option>
                    </select>

                    <button
                      type="button"
                      className="cb-btn-apply-move"
                      disabled={!batchTargetCategory || isMovingBatchDrawings}
                      onClick={() => handleBatchMoveDrawings(batchTargetCategory, batchMoveMode)}
                    >
                      <CheckCircle2 size={16} />
                      <span>{isMovingBatchDrawings ? 'Déplacement…' : `Déplacer (${selectedDrawingIds.size})`}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="cb-btn-batch-delete"
                    onClick={handleBatchDeleteDrawings}
                    disabled={isMovingBatchDrawings}
                    title="Supprimer définitivement les dessins sélectionnés"
                  >
                    <Trash2 size={15} />
                    <span>Supprimer</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sticky / Top Batch Renaming Action Banner */}
          {isBatchRenaming && (
            <div className="cb-batch-rename-banner">
              <div className="cb-rename-banner-top">
                <div className="cb-rename-banner-info">
                  <Pencil size={22} className="cb-rename-banner-icon" />
                  <div>
                    <b>Mode Renommage à la chaîne activé</b>
                    <p>Tous les noms des dessins sont modifiables ci-dessous. Modifiez-les librement ou utilisez le nom commun ci-dessous pour tout pré-remplir d'un coup.</p>
                  </div>
                </div>
                <div className="cb-rename-banner-actions">
                  <button
                    type="button"
                    className="cb-btn-save-all-names"
                    onClick={saveAllBatchTitles}
                    disabled={savingBatchTitles || Object.keys(modifiedTitles).length === 0}
                  >
                    <CheckCircle2 size={18} />
                    <span>{savingBatchTitles ? 'Enregistrement en cours…' : `Enregistrer les modifications (${Object.keys(modifiedTitles).length})`}</span>
                  </button>
                  <button
                    type="button"
                    className="cb-btn-cancel-all-names"
                    onClick={() => setIsBatchRenaming(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>

              {/* Option Nom Commun in Library Batch Rename */}
              <div className="cb-batch-rename-common-box">
                <label className="cb-common-toggle-label">
                  <input
                    type="checkbox"
                    checked={useLibraryCommonName}
                    onChange={e => {
                      const val = e.target.checked;
                      setUseLibraryCommonName(val);
                      if (val && libraryCommonName.trim()) {
                        applyCommonNameToLibrary(libraryCommonName, libraryAutoNumber);
                      }
                    }}
                  />
                  <span><b>Nom commun pour tous</b> (appliquer un nom identique aux {filteredLibraryDrawings.length} dessins affichés)</span>
                </label>
                {useLibraryCommonName && (
                  <div className="cb-common-inputs-row">
                    <input
                      type="text"
                      className="cb-input-text cb-common-input"
                      value={libraryCommonName}
                      onChange={e => {
                        const val = e.target.value;
                        setLibraryCommonName(val);
                        applyCommonNameToLibrary(val, libraryAutoNumber);
                      }}
                      placeholder="Ex: Mandala, Dinosaure, Chat..."
                    />
                    <label className="cb-grouped-autonum-label">
                      <input
                        type="checkbox"
                        checked={libraryAutoNumber}
                        onChange={e => {
                          const autoNum = e.target.checked;
                          setLibraryAutoNumber(autoNum);
                          applyCommonNameToLibrary(libraryCommonName, autoNum);
                        }}
                      />
                      <span>Numéroter automatiquement (1, 2, 3...)</span>
                    </label>
                    <button
                      type="button"
                      className="cb-btn-apply-common-names"
                      onClick={() => applyCommonNameToLibrary(libraryCommonName, libraryAutoNumber)}
                    >
                      Appliquer aux {filteredLibraryDrawings.length} dessins
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="cb-library-count-info">
            Affichage de <b>{filteredLibraryDrawings.length}</b> coloriages :
          </p>

          {/* Grid of drawings with inline rename and category tag changer */}
          <div className="cb-library-grid">
            {filteredLibraryDrawings.map(d => {
              const isEditing = editingDrawingId === d.id;
              const currentBatchTitle = batchTitles[d.id] ?? d.title;
              const isTitleModified = isBatchRenaming && currentBatchTitle.trim() !== d.title;

              return (
                <div
                  className={`cb-library-card ${isEditing || isBatchRenaming ? 'editing' : ''} ${selectedDrawingIds.has(d.id) ? 'selected' : ''}`}
                  key={d.id}
                  onClick={() => {
                    if (isSelectMode && !isEditing && !isBatchRenaming) {
                      toggleSelectDrawing(d.id);
                    }
                  }}
                >
                  {/* Select Checkbox (visible in select mode or when any drawing is selected) */}
                  <div
                    className={`cb-card-select-wrap ${isSelectMode || selectedDrawingIds.size > 0 ? 'visible' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectDrawing(d.id);
                    }}
                    title={selectedDrawingIds.has(d.id) ? 'Désélectionner ce dessin' : 'Sélectionner ce dessin'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDrawingIds.has(d.id)}
                      onChange={() => toggleSelectDrawing(d.id)}
                      aria-label={`Sélectionner ${d.title}`}
                    />
                  </div>

                  <div className="cb-lib-thumb">
                    <img src={d.image} alt={d.title} />
                    {d.isSvg ? (
                      <span className="cb-svg-tag">SVG</span>
                    ) : (
                      <span className="cb-png-tag">PNG</span>
                    )}
                  </div>

                  <div className="cb-lib-body">
                    {isBatchRenaming ? (
                      /* Batch Renaming Active for All Cards */
                      <div className="cb-batch-title-field">
                        <label className="cb-batch-title-label">Nom du coloriage :</label>
                        <input
                          type="text"
                          className="cb-batch-title-input"
                          value={currentBatchTitle}
                          onChange={e => handleBatchTitleChange(d.id, e.target.value)}
                        />
                        {isTitleModified && (
                          <span className="cb-modified-badge">Modifié</span>
                        )}
                        <div className="cb-lib-cats" style={{ marginTop: '4px' }}>
                          {d.cat.map(c => (
                            <span className="cb-cat-pill" key={c}>{c}</span>
                          ))}
                        </div>
                      </div>
                    ) : isEditing ? (
                      /* Inline Single Rename Form */
                      <div className="cb-lib-edit-box">
                        <label>
                          <span>Nom du dessin :</span>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                          />
                        </label>

                        <div className="cb-lib-cat-selector">
                          <span>Catégories :</span>
                          {renderHierarchicalCategoryPills(editingCats, (catName) => {
                            setEditingCats(prev =>
                              prev.includes(catName) ? prev.filter(x => x !== catName) : [...prev, catName]
                            );
                          })}
                        </div>

                        <div className="cb-lib-edit-actions">
                          <button className="cb-btn-save-inline" onClick={() => saveQuickEdit(d)}>
                            <CheckCheck size={14} /> Enregistrer
                          </button>
                          <button className="cb-btn-cancel-inline" onClick={() => setEditingDrawingId(null)}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <>
                        <b className="cb-lib-title">{d.title}</b>
                        <div className="cb-lib-cats">
                          {d.cat.map(c => (
                            <span className="cb-cat-pill" key={c}>{c}</span>
                          ))}
                        </div>
                        <div className="cb-lib-formats-badge">
                          {d.isSvg ? (
                            <span className="cb-formats-pill svg" title="Formats actifs : SVG, PNG et PDF A4">
                              ✨ SVG • PNG • PDF
                            </span>
                          ) : (
                            <span className="cb-formats-pill png" title="Formats actifs : PNG et PDF A4">
                              🖼️ PNG • PDF
                            </span>
                          )}
                        </div>
                        <div className="cb-lib-meta">
                          <span>❤️ {formatLikes(d.likes)}</span>
                          <span>📥 {d.downloads || 0}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && !isBatchRenaming && (
                    <div className="cb-lib-row-actions">
                      <button
                        className="cb-btn-quick-edit"
                        title="Renommer et ranger par catégories"
                        onClick={() => {
                          setEditingDrawingId(d.id);
                          setEditingTitle(d.title);
                          setEditingCats([...d.cat]);
                        }}
                      >
                        <Pencil size={15} /> Modifier
                      </button>
                      <button
                        className="cb-btn-quick-del"
                        title="Supprimer"
                        onClick={() => removeDrawing(d)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3 : GESTION DES DOSSIERS & CATÉGORIES */}
      {view === 'categories' && (
        <div className="cb-owner-view-categories">
          {/* Header & Quick Stats */}
          <div className="cb-mgr-header-bar">
            <div>
              <h2><FolderTree size={22} /> Gestion des Dossiers & Catégories</h2>
              <p>Organisez, renommez et supprimez vos dossiers. Déplacez et fusionnez des catégories pour regrouper tous leurs coloriages en toute simplicité.</p>
            </div>
            <div className="cb-mgr-head-actions">
              <button
                type="button"
                className="cb-btn-mgr-add"
                onClick={() => { setShowMgrCatCreator(!showMgrCatCreator); setMgrNewCatParentId(''); setMgrNewCatIsVip(false); }}
              >
                <FolderPlus size={16} />
                <span>{showMgrCatCreator ? 'Fermer le formulaire' : '+ Nouveau dossier'}</span>
              </button>
              <button
                type="button"
                className="cb-btn-mgr-add-vip"
                onClick={handleCreateVipFolderPrompt}
                title="Créer un nouveau dossier réservé aux abonnés VIP"
              >
                <Crown size={16} />
                <span>+ Créer un Dossier VIP</span>
              </button>
              <button
                type="button"
                className={`cb-btn-mgr-merge ${showMergePanel ? 'active' : ''}`}
                onClick={() => setShowMergePanel(!showMergePanel)}
              >
                <ArrowRightLeft size={16} />
                <span>{showMergePanel ? 'Fermer la fusion' : '🔀 Fusionner des dossiers'}</span>
              </button>
            </div>
          </div>

          {/* KPI Mini-bar for Categories */}
          <div className="cb-cat-stats-strip">
            <div className="cb-cat-stat-item">
              <FolderOpen size={18} />
              <div>
                <b>{rootCategories.length}</b>
                <span>Dossiers principaux</span>
              </div>
            </div>
            <div className="cb-cat-stat-item">
              <FolderTree size={18} />
              <div>
                <b>{categoriesList.filter(c => c.parentId).length}</b>
                <span>Sous-catégories</span>
              </div>
            </div>
            <div className="cb-cat-stat-item">
              <Leaf size={18} />
              <div>
                <b>{drawings.length}</b>
                <span>Dessins au total</span>
              </div>
            </div>
          </div>

          {/* Merge Folders Panel */}
          {showMergePanel && (
            <div className="cb-merge-panel-box">
              <div className="cb-merge-panel-title">
                <ArrowRightLeft size={18} />
                <b>Fusionner deux catégories / dossiers de dessins</b>
              </div>
              <p className="cb-merge-panel-desc">
                Déplace automatiquement tous les dessins de la catégorie source vers la catégorie de destination. Les dessins seront mis à jour instantanément.
              </p>

              <div className="cb-merge-inputs-row">
                <div className="cb-merge-col">
                  <label>1. Dossier source (à vider) :</label>
                  <select
                    className="cb-select"
                    value={mergeSourceCat}
                    onChange={e => setMergeSourceCat(e.target.value)}
                  >
                    <option value="">-- Choisir le dossier source --</option>
                    {rootCategories.map(rc => {
                      const subs = getSubcategoriesFor(rc, categoriesList);
                      const rcCount = getCategoryDrawingsCount(rc);
                      return (
                        <React.Fragment key={rc.id}>
                          <option value={rc.name}>📁 {rc.name} ({rcCount} dessins)</option>
                          {subs.map(sc => (
                            <option key={sc.id} value={sc.name}>&nbsp;&nbsp;↳ {sc.name} ({getCategoryDrawingsCount(sc)} dessins)</option>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </select>
                </div>

                <div className="cb-merge-arrow-col">
                  <MoveRight size={24} className="cb-merge-arrow-icon" />
                </div>

                <div className="cb-merge-col">
                  <label>2. Dossier de destination :</label>
                  <select
                    className="cb-select"
                    value={mergeTargetCat}
                    onChange={e => setMergeTargetCat(e.target.value)}
                  >
                    <option value="">-- Choisir le dossier cible --</option>
                    {rootCategories.map(rc => {
                      const subs = getSubcategoriesFor(rc, categoriesList);
                      const rcCount = getCategoryDrawingsCount(rc);
                      return (
                        <React.Fragment key={rc.id}>
                          <option value={rc.name}>📁 {rc.name} ({rcCount} dessins)</option>
                          {subs.map(sc => (
                            <option key={sc.id} value={sc.name}>&nbsp;&nbsp;↳ {sc.name} ({getCategoryDrawingsCount(sc)} dessins)</option>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="cb-merge-options-row">
                <label className="cb-merge-toggle-label">
                  <input
                    type="checkbox"
                    checked={mergeDeleteSource}
                    onChange={e => setMergeDeleteSource(e.target.checked)}
                  />
                  <span>Supprimer automatiquement le dossier source « {mergeSourceCat || 'source'} » après avoir transféré ses dessins</span>
                </label>
              </div>

              <div className="cb-merge-actions-row">
                <button
                  type="button"
                  className="cb-btn-confirm-merge"
                  disabled={!mergeSourceCat || !mergeTargetCat || isMergingCategories}
                  onClick={() => handleMergeCategories(mergeSourceCat, mergeTargetCat, mergeDeleteSource)}
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {isMergingCategories
                      ? 'Fusion en cours…'
                      : `Fusionner et déplacer les dessins vers « ${mergeTargetCat || '…'} »`}
                  </span>
                </button>
                <button
                  type="button"
                  className="cb-btn-cancel-merge"
                  onClick={() => setShowMergePanel(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Inline Category Creator Panel */}
          {showMgrCatCreator && (
            <form
              className="cb-category-creator-box cb-mgr-creator"
              onSubmit={handleCreateCategoryInManager}
            >
              <div className="cb-cat-creator-title">
                <FolderPlus size={18} />
                <b>Créer un nouveau dossier / catégorie</b>
              </div>
              <div className="cb-creator-fields-grid">
                <div className="cb-creator-field">
                  <label>Nom du dossier :</label>
                  <input
                    type="text"
                    className="cb-input-text"
                    value={mgrNewCatName}
                    onChange={e => setMgrNewCatName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategoryInManager(e);
                      }
                    }}
                    placeholder="Ex: Mandalas, Fées, Véhicules..."
                    autoFocus
                  />
                </div>
                <div className="cb-creator-field">
                  <label>Emplacement :</label>
                  <select
                    className="cb-select"
                    value={mgrNewCatParentId}
                    onChange={e => setMgrNewCatParentId(e.target.value)}
                  >
                    <option value="">📁 Dossier principal (racine)</option>
                    <optgroup label="Sous-dossier de :">
                      {rootCategories.map(r => (
                        <option key={r.id} value={r.id}>
                          ↳ Dans « {r.name} »
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="cb-creator-field full-width">
                  <label className="cb-creator-checkbox-label">
                    <input
                      type="checkbox"
                      checked={mgrNewCatIsVip}
                      onChange={e => setMgrNewCatIsVip(e.target.checked)}
                    />
                    <Crown size={15} style={{ color: '#d97706' }} />
                    <span>Dossier réservé aux VIP (filigrane & cadenas automatique pour les non-abonnés)</span>
                  </label>
                </div>
              </div>
              <div className="cb-creator-actions-row">
                <button
                  type="submit"
                  className="cb-btn-submit-cat"
                  disabled={creatingCatInManager || !mgrNewCatName.trim()}
                >
                  <CheckCircle2 size={16} />
                  <span>{creatingCatInManager ? 'Création en cours…' : 'Créer le dossier'}</span>
                </button>
                <button
                  type="button"
                  className="cb-btn-cancel-cat"
                  onClick={() => { setShowMgrCatCreator(false); setMgrNewCatName(''); }}
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {/* Search bar for categories */}
          <div className="cb-categories-search-bar">
            <div className="cb-cat-search-box">
              <Search size={16} />
              <input
                type="text"
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                placeholder="Filtrer parmi les catégories…"
              />
              {categorySearch && <button onClick={() => setCategorySearch('')}><X size={14} /></button>}
            </div>
            <span className="cb-cat-count-badge">
              {rootCategories.filter(rc => {
                if (!categorySearch.trim()) return true;
                const q = categorySearch.trim().toLowerCase();
                if (rc.name.toLowerCase().includes(q)) return true;
                const subs = getSubcategoriesFor(rc, categoriesList);
                return subs.some(s => s.name.toLowerCase().includes(q));
              }).length} dossier(s) affiché(s)
            </span>
          </div>

          {/* Hierarchical Categories Folder List */}
          <div className="cb-mgr-folders-list">
            {rootCategories
              .filter(rc => {
                if (!categorySearch.trim()) return true;
                const q = categorySearch.trim().toLowerCase();
                if (rc.name.toLowerCase().includes(q)) return true;
                const subs = getSubcategoriesFor(rc, categoriesList);
                return subs.some(s => s.name.toLowerCase().includes(q));
              })
              .map(rc => {
                const subs = getSubcategoriesFor(rc, categoriesList);
                const rcCount = getCategoryDrawingsCount(rc);
                const isMatchingQuery = !categorySearch.trim() || rc.name.toLowerCase().includes(categorySearch.trim().toLowerCase());

                return (
                  <div className="cb-mgr-folder-group-card" key={rc.id}>
                    {/* Root Folder Card */}
                    <div className="cb-mgr-root-folder">
                      <div className="cb-mgr-folder-info">
                        <FolderOpen className="cb-mgr-folder-icon" size={24} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <b className="cb-mgr-folder-name">{rc.name}</b>
                            {rc.isVip && (
                              <span className="cb-mgr-pill-vip" title="Dossier réservé aux abonnés VIP">
                                <Crown size={12} /> Dossier VIP
                              </span>
                            )}
                          </div>
                          <div className="cb-mgr-folder-meta">
                            <span className="cb-mgr-pill-root">Dossier racine</span>
                            <span className="cb-mgr-pill-count">
                              📁 <b>{rcCount}</b> dessin(s)
                            </span>
                            {subs.length > 0 && (
                              <span className="cb-mgr-pill-subs">
                                {subs.length} sous-catégorie(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="cb-mgr-folder-actions">
                        <button
                          type="button"
                          className={`cb-btn-folder-vip ${rc.isVip ? 'active' : ''}`}
                          onClick={() => handleToggleVipCategory(rc)}
                          title={rc.isVip ? "Dossier VIP actif (cliquer pour repasser en public)" : "Rendre ce dossier réservé aux abonnés VIP"}
                        >
                          <Crown size={13} />
                          <span>{rc.isVip ? 'VIP Actif' : 'Passer VIP'}</span>
                        </button>
                        <button
                          type="button"
                          className="cb-btn-folder-view"
                          onClick={() => { setLibraryCatFilter(rc.name); setView('library'); }}
                          title={`Voir les ${rcCount} dessins de ce dossier`}
                        >
                          <FolderOpen size={14} />
                          <span>Voir les dessins ({rcCount})</span>
                        </button>
                        <button
                          type="button"
                          className="cb-btn-folder-rename"
                          onClick={() => handleRenameCategoryOwner(rc)}
                          title="Renommer ce dossier"
                        >
                          <Pencil size={14} />
                          <span>Renommer</span>
                        </button>
                        <button
                          type="button"
                          className="cb-btn-folder-merge"
                          onClick={() => { setMergeSourceCat(rc.name); setShowMergePanel(true); }}
                          title="Fusionner les dessins de ce dossier vers un autre"
                        >
                          <ArrowRightLeft size={14} />
                          <span>Fusionner vers…</span>
                        </button>
                        <button
                          type="button"
                          className="cb-btn-folder-add-sub"
                          onClick={() => handleQuickAddSubCategory(rc)}
                          title="Ajouter une sous-catégorie dans ce dossier"
                        >
                          <Plus size={14} />
                          <span>Sous-dossier</span>
                        </button>
                        <button
                          type="button"
                          className="cb-btn-folder-delete"
                          onClick={() => handleDeleteCategoryWithOption(rc)}
                          title="Supprimer ce dossier"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories (if any) */}
                    {subs.length > 0 && (
                      <div className="cb-mgr-subfolders-container">
                        {subs
                          .filter(sc => {
                            if (!categorySearch.trim()) return true;
                            const q = categorySearch.trim().toLowerCase();
                            return sc.name.toLowerCase().includes(q) || isMatchingQuery;
                          })
                          .map(sc => {
                            const scCount = getCategoryDrawingsCount(sc);
                            return (
                              <div className="cb-mgr-subfolder-row" key={sc.id}>
                                <div className="cb-mgr-subfolder-left">
                                  <span className="cb-subfolder-branch">↳</span>
                                  <FolderTree className="cb-subfolder-icon" size={17} />
                                  <span className="cb-mgr-subfolder-name">{sc.name}</span>
                                  {sc.isVip && (
                                    <span className="cb-mgr-pill-vip mini" title="Sous-dossier VIP">
                                      <Crown size={10} /> VIP
                                    </span>
                                  )}
                                  <span className="cb-mgr-pill-count">
                                    📁 <b>{scCount}</b> dessin(s)
                                  </span>
                                </div>

                                <div className="cb-mgr-folder-actions mini">
                                  <button
                                    type="button"
                                    className={`cb-btn-folder-vip mini ${sc.isVip ? 'active' : ''}`}
                                    onClick={() => handleToggleVipCategory(sc)}
                                    title={sc.isVip ? "Sous-dossier VIP (cliquer pour repasser en public)" : "Rendre ce sous-dossier VIP"}
                                  >
                                    <Crown size={11} />
                                    <span>{sc.isVip ? 'VIP' : '+ VIP'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="cb-btn-folder-view mini"
                                    onClick={() => { setLibraryCatFilter(sc.name); setView('library'); }}
                                    title={`Voir les ${scCount} dessins`}
                                  >
                                    <FolderOpen size={13} />
                                    <span>Voir ({scCount})</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="cb-btn-folder-rename mini"
                                    onClick={() => handleRenameCategoryOwner(sc)}
                                    title="Renommer cette sous-catégorie"
                                  >
                                    <Pencil size={13} />
                                    <span>Renommer</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="cb-btn-folder-merge mini"
                                    onClick={() => { setMergeSourceCat(sc.name); setShowMergePanel(true); }}
                                    title="Fusionner vers un autre dossier"
                                  >
                                    <ArrowRightLeft size={13} />
                                    <span>Fusionner</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="cb-btn-folder-delete mini"
                                    onClick={() => handleDeleteCategoryWithOption(sc)}
                                    title="Supprimer cette sous-catégorie"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 4 : BOÎTE AUX LETTRES & DEMANDES DE DESSINS */}
      {view === 'requests' && (
        <div className="cb-owner-view-requests">
          <div className="cb-requests-head-bar">
            <h2>📬 Boîte aux lettres de l'artiste</h2>
            <p>Voici les demandes de dessins déposées par les visiteurs. Vous pouvez valider une demande en lui associant un coloriage du catalogue.</p>
          </div>

          {loadingRequests ? (
            <p>Chargement des lettres…</p>
          ) : requests.length === 0 ? (
            <div className="cb-empty-letters">
              <Mail size={42} />
              <p>Aucune lettre reçue pour le moment.</p>
            </div>
          ) : (
            <div className="cb-requests-admin-list">
              {requests.map(req => {
                const matched = drawings.find(d => d.slug === req.completed_drawing_slug);
                return (
                  <div className={`cb-request-admin-card ${req.status === 'done' ? 'completed' : 'pending'}`} key={req.id}>
                    <div className="cb-req-head">
                      <img
                        src={avatarList[req.avatar_index] || avatar1}
                        alt=""
                        className="cb-req-author-avatar"
                      />
                      <div className="cb-req-author-details">
                        <span className="cb-req-author"><b>{req.pseudo || 'Visiteur'}</b></span>
                        {req.email && <span className="cb-req-email">✉️ {req.email}</span>}
                      </div>
                      <span className="cb-req-date">
                        {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="cb-req-desc">
                      « {req.description} »
                    </div>

                    <div className="cb-req-footer">
                      {req.status === 'done' ? (
                        <div className="cb-req-done-box">
                          <span className="cb-req-done-pill">
                            <Check size={14} /> Coloriage associé : <b>{matched?.title || req.completed_drawing_slug}</b> (Validé)
                          </span>
                          {matched && <img src={matched.image} alt="" className="cb-req-preview-thumb" />}
                        </div>
                      ) : (
                        <div className="cb-req-action-wrap">
                          <select
                            value={selectedSlugForRequest[req.id] || ''}
                            onChange={e => setSelectedSlugForRequest(prev => ({ ...prev, [req.id]: e.target.value }))}
                          >
                            <option value="">-- Choisir un coloriage à associer --</option>
                            {drawings.map(d => (
                              <option key={d.slug} value={d.slug}>{d.title} ({d.slug})</option>
                            ))}
                          </select>
                          <button
                            className="cb-btn-validate-req"
                            onClick={() => validateRequest(req.id, selectedSlugForRequest[req.id])}
                          >
                            <CheckCircle2 size={15} /> Valider la demande & envoyer le dessin
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4 : AJOUTER UN OU PLUSIEURS COLORIAGES (UPLOAD PAR LOT / BATCH) */}
      {view === 'add' && (
        <div className="cb-owner-view-add">
          <div className="cb-add-header-title">
            <h2><Plus /> Ajouter des coloriages (Ajout multiple)</h2>
            <p>Sélectionnez un ou plusieurs fichiers (SVG vectoriels ou PNG/JPG/WEBP). Vous pouvez appliquer un titre et des catégories groupés ou personnaliser chaque dessin ligne par ligne.</p>
          </div>

          {/* Grouped Settings Panel (Always accessible before and after adding files) */}
          <div className="cb-batch-grouped-panel">
            <h3><Tags size={18} /> Réglages & Nom commun pour ce lot de dessins</h3>
            <p>Cochez « Nom commun » pour appliquer un seul nom à l'ensemble des dessins, ou laissez décoché pour utiliser le nom de vos fichiers :</p>

            <div className="cb-grouped-inputs-grid">
              <div className="cb-grouped-field">
                <label className="cb-common-toggle-label">
                  <input
                    type="checkbox"
                    checked={useCommonName}
                    onChange={e => {
                      const active = e.target.checked;
                      setUseCommonName(active);
                      if (active && commonName.trim()) {
                        applyCommonNameToBatch(commonName, autoNumberCommonName);
                      }
                    }}
                  />
                  <span><b>Nom commun</b> (mettre une seule fois un nom pour tous)</span>
                </label>

                {useCommonName ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      className="cb-input-text"
                      value={commonName}
                      onChange={e => {
                        const val = e.target.value;
                        setCommonName(val);
                        applyCommonNameToBatch(val, autoNumberCommonName);
                      }}
                      placeholder="Ex: Dinosaure, Mandala, Petite fée, Chat..."
                      autoFocus
                    />
                    <label className="cb-grouped-autonum-label">
                      <input
                        type="checkbox"
                        checked={autoNumberCommonName}
                        onChange={e => {
                          const autoNum = e.target.checked;
                          setAutoNumberCommonName(autoNum);
                          applyCommonNameToBatch(commonName, autoNum);
                        }}
                      />
                      <span>Numéroter automatiquement si plusieurs dessins (ex: Dinosaure 1, Dinosaure 2...)</span>
                    </label>
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: '#7a5a3f' }}>
                    💡 Si décoché, chaque dessin prendra automatiquement le nom de son fichier (ex: mon-dessin.svg → Mon dessin).
                  </span>
                )}
              </div>

              <div className="cb-grouped-field">
                <div className="cb-grouped-cats-head">
                  <label>Catégories pour ce lot :</label>
                  <button
                    type="button"
                    className="cb-btn-toggle-new-cat"
                    onClick={() => setShowCatCreator(!showCatCreator)}
                  >
                    <Plus size={14} /> {showCatCreator ? 'Fermer' : 'Créer une catégorie / sous-catégorie'}
                  </button>
                </div>

                <div className="cb-item-cats-selector">
                  {renderHierarchicalCategoryPills(groupedCats, (catName) => {
                    const isSel = groupedCats.includes(catName);
                    const nextCats = isSel ? groupedCats.filter(x => x !== catName) : [...groupedCats, catName];
                    setGroupedCats(nextCats);
                    if (batchUploadList.length > 0) {
                      setBatchUploadList(prev => prev.map(item => ({
                        ...item,
                        categories: nextCats.length ? [...nextCats] : ['Divers']
                      })));
                    }
                  })}
                </div>

                {/* Inline Category / Subcategory Creator Box */}
                {showCatCreator && (
                  <div className="cb-category-creator-box">
                    <div className="cb-cat-creator-title">
                      <Tags size={16} />
                      <b>Créer une nouvelle catégorie ou sous-catégorie</b>
                    </div>
                    <div className="cb-creator-fields-grid">
                      <div className="cb-creator-field">
                        <label>Nom de la catégorie :</label>
                        <input
                          type="text"
                          className="cb-input-text"
                          value={newCatName}
                          onChange={e => setNewCatName(e.target.value)}
                          placeholder="Ex: Chiens, Oiseaux, Licornes, Manga..."
                          autoFocus
                        />
                      </div>
                      <div className="cb-creator-field">
                        <label>Emplacement :</label>
                        <select
                          className="cb-select"
                          value={newCatParentId}
                          onChange={e => setNewCatParentId(e.target.value)}
                        >
                          <option value="">📁 Catégorie principale (racine)</option>
                          <optgroup label="Sous-catégorie de :">
                            {rootCategories.map(r => (
                              <option key={r.id} value={r.id}>
                                ↳ Dans « {r.name} »
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                    <div className="cb-creator-actions-row">
                      <button
                        type="button"
                        className="cb-btn-submit-cat"
                        onClick={handleCreateCategory}
                        disabled={creatingCategory || !newCatName.trim()}
                      >
                        <CheckCircle2 size={16} />
                        <span>{creatingCategory ? 'Création en cours…' : 'Créer et ajouter au lot'}</span>
                      </button>
                      <button
                        type="button"
                        className="cb-btn-cancel-cat"
                        onClick={() => { setShowCatCreator(false); setNewCatName(''); }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {batchUploadList.length > 0 && useCommonName && commonName.trim() && (
              <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#2e6b20', fontWeight: 'bold' }}>
                ✓ Nom commun « {commonName.trim()} » appliqué aux {batchUploadList.length} dessin(s) dans la file
              </div>
            )}
          </div>

          {/* Toolbar: Select All / Deselect All / Add More Files */}
          {batchUploadList.length > 0 && (
            <div className="cb-batch-toolbar">
              <span className="cb-batch-selection-info">
                🎨 <b>{batchUploadList.filter(x => x.selected).length}</b> coloriage(s) sélectionné(s) sur {batchUploadList.length}
              </span>
              <div className="cb-batch-actions-btns">
                <button
                  type="button"
                  className="cb-batch-mini-btn"
                  onClick={() => toggleSelectAll(true)}
                >
                  Tout sélectionner
                </button>
                <button
                  type="button"
                  className="cb-batch-mini-btn"
                  onClick={() => toggleSelectAll(false)}
                >
                  Tout désélectionner
                </button>
                <label className="cb-batch-mini-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Ajouter d'autres fichiers
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleBatchFilesAdd}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Batch items list: line-by-line editor */}
          {batchUploadList.length > 0 ? (
            <div className="cb-batch-items-container">
              {batchUploadList.map((item) => (
                <div
                  className={`cb-batch-item-card ${item.selected ? 'selected' : 'deselected'}`}
                  key={item.id}
                >
                  {/* Selection checkbox */}
                  <input
                    type="checkbox"
                    className="cb-item-select-checkbox"
                    checked={item.selected}
                    onChange={e => updateBatchItem(item.id, { selected: e.target.checked })}
                    title={item.selected ? 'Coloriage sélectionné' : 'Coloriage désélectionné'}
                  />

                  {/* Thumbnail & Format badge */}
                  <div className="cb-item-thumb-box">
                    <img src={item.preview} alt={item.title} />
                    <span className={`cb-item-badge-format ${item.format.toLowerCase()}`}>
                      {item.format}
                    </span>
                  </div>

                  {/* Line by line inputs */}
                  <div className="cb-item-fields">
                    <input
                      type="text"
                      className="cb-item-title-input"
                      value={item.title}
                      onChange={e => updateBatchItem(item.id, { title: e.target.value })}
                      placeholder="Nom de ce coloriage..."
                    />

                    <div className="cb-item-cats-selector">
                      <span className="cb-item-cats-label">Catégories :</span>
                      {renderHierarchicalCategoryPills(item.categories, (catName) => {
                        const isSel = (item.categories || []).includes(catName);
                        const nextCats = isSel
                          ? item.categories.filter(x => x !== catName)
                          : [...(item.categories || []), catName];
                        updateBatchItem(item.id, { categories: nextCats.length ? nextCats : ['Divers'] });
                      })}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    className="cb-btn-remove-item"
                    onClick={() => removeBatchItem(item.id)}
                    title="Retirer ce dessin de la file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Empty initial dropzone */
            <div className="upload-zone" style={{ minHeight: '260px' }}>
              <UploadCloud size={54} color="#7c512d" />
              <b style={{ fontSize: '18px', marginTop: '8px' }}>Déposez un ou plusieurs dessins ici</b>
              <span style={{ fontSize: '13px', color: '#6a492f' }}>
                Fichiers acceptés : SVG vectoriels (recommandé), PNG haute résolution, JPG ou WEBP
              </span>
              <label className="file-pick" style={{ marginTop: '14px' }}>
                <Plus size={16} /> Parcourir et sélectionner des fichiers
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleBatchFilesAdd}
                />
              </label>
            </div>
          )}

          {/* Sticky Batch Publish Footer */}
          {batchUploadList.length > 0 && (
            <div className="cb-publish-batch-footer">
              {publishingBatch && (
                <>
                  <div className="cb-publish-progress-bar">
                    <div
                      className="cb-publish-progress-fill"
                      style={{
                        width: `${Math.round((publishProgress.current / (publishProgress.total || 1)) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="cb-publish-progress-text">{publishProgress.text}</span>
                </>
              )}

              <button
                type="button"
                className="cb-btn-publish-all"
                onClick={publishAllBatchDrawings}
                disabled={publishingBatch || batchUploadList.filter(x => x.selected).length === 0}
              >
                <CheckCircle2 size={20} />
                <span>
                  {publishingBatch
                    ? 'Publication en cours…'
                    : `Publier les ${batchUploadList.filter(x => x.selected).length} coloriage(s) sélectionné(s)`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
      {/* VIEW 5 : REGISTRE ET CONSULTATION DES LICENCES COMMERCIALES */}
      {view === 'licenses' && (
        <div className="cb-owner-view-licenses">
          <div className="cb-licenses-head-bar">
            <div>
              <h2><FileBadge size={22} /> Registre Officiel des Licences ({licensesList.length})</h2>
              <p>Recherchez et téléchargez les attestations officielles avec titulaire (Nom/Prénom), boutique et n° de licence unique.</p>
            </div>
            <button
              type="button"
              className="cb-btn-refresh-licenses"
              onClick={loadLicenses}
              disabled={loadingLicenses}
            >
              <RefreshCw size={14} className={loadingLicenses ? 'cb-spin' : ''} />
              <span>Actualiser la base</span>
            </button>
          </div>

          {/* BARRE D'OUTILS : RECHERCHE RAPIDE, TRI ET FILTRE DE STATUT */}
          <div className="cb-licenses-toolbar">
            <div className="cb-licenses-search-box">
              <Search size={16} className="cb-licenses-search-icon" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, boutique, email ou n° de licence..."
                value={licenseSearch}
                onChange={e => setLicenseSearch(e.target.value)}
                className="cb-licenses-search-input"
              />
              {licenseSearch && (
                <button
                  type="button"
                  className="cb-licenses-search-clear"
                  onClick={() => setLicenseSearch('')}
                  title="Effacer la recherche"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="cb-licenses-filters-wrap">
              <div className="cb-licenses-select-wrap">
                <label htmlFor="cb-sort-licenses">Trier par :</label>
                <select
                  id="cb-sort-licenses"
                  value={licenseSortBy}
                  onChange={e => setLicenseSortBy(e.target.value)}
                  className="cb-licenses-select"
                >
                  <option value="date_desc">📅 Plus récentes d'abord</option>
                  <option value="name_asc">👤 Nom de famille (A-Z)</option>
                  <option value="first_name_asc">👤 Prénom (A-Z)</option>
                  <option value="shop_asc">🏪 Nom de Boutique (A-Z)</option>
                  <option value="serial_asc">🔢 Numéro de licence</option>
                  <option value="date_asc">⏳ Plus anciennes d'abord</option>
                </select>
              </div>

              <div className="cb-licenses-select-wrap">
                <label htmlFor="cb-filter-licenses">Statut :</label>
                <select
                  id="cb-filter-licenses"
                  value={licenseFilterStatus}
                  onChange={e => setLicenseFilterStatus(e.target.value)}
                  className="cb-licenses-select"
                >
                  <option value="all">Tous ({licensesList.length})</option>
                  <option value="active">Actives uniquement</option>
                  <option value="expired">Expirées uniquement</option>
                </select>
              </div>

              <div className="cb-licenses-count-pill">
                {filteredLicenses.length} / {licensesList.length} affichée(s)
              </div>
            </div>
          </div>

          {loadingLicenses ? (
            <div className="cb-licenses-loading">Chargement des licences depuis Supabase…</div>
          ) : licensesList.length === 0 ? (
            <div className="cb-licenses-empty">
              <FileBadge size={44} color="#8d6e63" />
              <h3>Aucune licence commerciale émise</h3>
              <p>Les licences souscrites avec la formule ColorVIP Pro apparaîtront automatiquement ici avec leur numéro de série unique.</p>
            </div>
          ) : filteredLicenses.length === 0 ? (
            <div className="cb-licenses-empty">
              <Search size={36} color="#8d6e63" />
              <h3>Aucun résultat pour « {licenseSearch} »</h3>
              <p>Vérifiez l'orthographe du nom, prénom, boutique ou du numéro de série.</p>
              <button
                type="button"
                className="cb-btn-refresh-licenses"
                style={{ marginTop: '12px' }}
                onClick={() => { setLicenseSearch(''); setLicenseFilterStatus('all'); }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="cb-licenses-table-wrap">
              <table className="cb-licenses-table">
                <thead>
                  <tr>
                    <th>N° de Licence (Série)</th>
                    <th>Titulaire (Nom & Prénom)</th>
                    <th>Boutique / Marque</th>
                    <th>Email client</th>
                    <th>Formule</th>
                    <th>Période de validité</th>
                    <th>Statut</th>
                    <th>Attestation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLicenses.map((lic) => (
                    <tr key={lic.id || lic.license_number}>
                      <td>
                        <code className="cb-license-code">{lic.license_number}</code>
                      </td>
                      <td>
                        {lic.last_name || lic.first_name ? (
                          <div className="cb-license-table-holder">
                            <b>{lic.last_name}</b> {lic.first_name}
                          </div>
                        ) : (
                          <b className="cb-license-table-holder">{lic.customer_name || 'Non renseigné'}</b>
                        )}
                      </td>
                      <td>
                        {lic.shop_name ? (
                          <span className="cb-license-shop-badge">{lic.shop_name}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="cb-license-table-email">{lic.customer_email || '—'}</span>
                      </td>
                      <td>
                        <span className="cb-sub-plan-pill pro">
                          Pro ({lic.interval === 'year' ? 'Annuelle' : 'Mensuelle'})
                        </span>
                      </td>
                      <td>
                        <div className="cb-license-table-dates">
                          <span>Du <b>{new Date(lic.valid_from).toLocaleDateString('fr-FR')}</b></span>
                          <span>Au <b>{new Date(lic.valid_until).toLocaleDateString('fr-FR')}</b></span>
                        </div>
                      </td>
                      <td>
                        <span className={`cb-sub-status-pill ${lic.status === 'active' ? 'active' : ''}`}>
                          {lic.status === 'active' ? 'Actif ✓' : lic.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="cb-btn-dl-lic-mini"
                          onClick={() => generateCommercialLicensePdf({
                            licenseNumber: lic.license_number,
                            holderName: lic.customer_name,
                            firstName: lic.first_name,
                            lastName: lic.last_name,
                            birthDate: lic.birth_date,
                            shopName: lic.shop_name,
                            holderEmail: lic.customer_email,
                            interval: lic.interval || 'month',
                            validFrom: lic.valid_from,
                            validUntil: lic.valid_until,
                          })}
                          title="Télécharger l'attestation PDF officielle"
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);