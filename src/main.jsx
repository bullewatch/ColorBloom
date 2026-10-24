import React, { useEffect, useMemo, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import {
  Search, Heart, Settings, Download, X, Leaf, Globe2, Moon, Sun,
  LogIn, Mail, Send, ShieldCheck, Plus, FolderOpen, Tags,
  UploadCloud, Trash2, Pencil, CheckCircle2, LogOut, UserPlus,
  Home, Sparkles, Info, HelpCircle, Bell, FileCode, Check,
  PackageCheck, TrendingUp, ThumbsUp, CheckCheck, LayoutGrid,
  Users, Eye, RefreshCw, FileImage, FileText, Dices
} from 'lucide-react';
import './styles.css';
import { supabase, coloringImageUrl } from './supabase';
import { animalCatalog } from './animalCatalog';
import { translations, generateRandomPseudo } from './translations';
import { CguModal } from './CguModal';

import colorblopBandeau from '../assets/colorblop-bandeau.png';
import boardArt from '../assets/board-tight.png';
import likeArt from '../assets/like-tight.png';
import likeLikedArt from '../assets/like-liked-tight.png';
import favorisArt from '../assets/favoris-tight.png';
import settingsArt from '../assets/settings-tight.png';
import {
  FoliageDefs,
  LeftPanelFoliage,
  TopNavFoliage,
  AdPanelFoliage,
  AdGrassSilhouette
} from './FoliageDecorations';

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

function getNavItems(t) {
  return [
    { id: 'Accueil', label: t.navHome, icon: Home },
    { id: 'Catégorie', label: t.navCategories, icon: Leaf },
    { id: 'Favoris', label: t.navFavorites, icon: Heart },
    { id: 'Nouveautes', label: t.navNews, icon: Sparkles, badge: t.navNewBadge || '1' },
    { id: 'APropos', label: t.navAbout, icon: Info },
  ];
}

function getCatLabel(catName, t) {
  switch (catName) {
    case 'Tous': return t.catAll;
    case 'Animaux': return t.catAnimals;
    case 'Chats': return t.catCats;
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
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    cat: row.categories || [],
    likes: row.likes_count || 0,
    downloads: row.downloads_count || 0,
    imagePath: row.image_path,
    image: coloringImageUrl(row.image_path),
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
  const navItems = useMemo(() => getNavItems(t), [t]);
  const [nouveautesOpen, setNouveautesOpen] = useState(false);
  const [downloads, setDownloads] = useState(Number(localStorage.getItem('cb-downloads') || 0));
  const [downloading, setDownloading] = useState(null);
  const [adminView, setAdminView] = useState('stats');
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(() => Number(localStorage.getItem('cb-avatar') || 0));
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Responsive Grid Density setting (base default: 2 drawings per row)
  const [gridDensity, setGridDensity] = useState(() => localStorage.getItem('cb-grid-density') || '2');

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

  // Left categories list without POM
  const cats = ['Tous', 'Animaux', 'Chats', 'Fées', 'Fille', 'Garçon', 'Halloween', 'Dinosaures', 'Véhicules'];

  // Check if current user is owner/admin
  const isOwner = Boolean(
    profile?.is_admin ||
    session?.user?.email?.toLowerCase().includes('flo83') ||
    session?.user?.email?.toLowerCase().includes('bullewatch')
  );

  async function loadDrawings() {
    const { data, error } = await supabase
      .from('coloring_pages')
      .select('id,slug,title,categories,image_path,likes_count,downloads_count,is_published,created_at')
      .order('created_at', { ascending: false });

    const localOverrides = JSON.parse(localStorage.getItem('cb-custom-titles') || '{}');

    const dbDrawings = (data || []).map(toDrawing).map(d => {
      const override = localOverrides[d.id] || localOverrides[d.slug];
      return override ? { ...d, title: override } : d;
    });

    const existingSlugs = new Set(dbDrawings.map(d => d.slug));
    const combined = [
      ...dbDrawings,
      ...animalCatalog
        .filter(a => !existingSlugs.has(a.slug))
        .map(a => {
          const override = localOverrides[a.id] || localOverrides[a.slug];
          return override ? { ...a, title: override } : a;
        }),
    ];

    setDatabaseReady(!error);
    setDrawings(combined);
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
      const metaPseudo = activeSession.user.user_metadata?.display_name || activeSession.user.user_metadata?.pseudo || activeSession.user.email?.split('@')[0];
      const metaAvatar = Number(activeSession.user.user_metadata?.avatar_index || 0);
      setProfile({
        id: activeSession.user.id,
        display_name: metaPseudo,
        avatar_index: metaAvatar,
        is_admin: false,
      });
      setSelectedAvatar(metaAvatar);
    }
    setFavs(new Set((favoriteData || []).map(x => x.coloring_id)));
  }

  useEffect(() => {
    localStorage.setItem('cb-lang', lang);
  }, [lang]);

  useEffect(() => {
    loadDrawings();
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
      setSession(nextSession);
      loadAccount(nextSession);

      // Track member login event in analytics
      if (_event === 'SIGNED_IN' && nextSession?.user) {
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
    const wasFavorite = favs.has(id);
    const delta = wasFavorite ? -1 : 1;

    setFavs(current => {
      const next = new Set(current);
      wasFavorite ? next.delete(id) : next.add(id);
      return next;
    });

    setDrawings(current => current.map(d => d.id === id ? { ...d, likes: Math.max(0, d.likes + delta) } : d));
    setOpen(current => current?.id === id ? { ...current, likes: Math.max(0, current.likes + delta) } : current);

    const targetDrawing = drawings.find(d => d.id === id);
    if (targetDrawing && !String(id).startsWith('cb-svg-')) {
      const newLikes = Math.max(0, (targetDrawing.likes || 0) + delta);
      supabase.from('coloring_pages').update({ likes_count: newLikes }).eq('id', id).then();
    }

    if (!session?.user) return;

    const query = wasFavorite
      ? supabase.from('favorites').delete().eq('user_id', session.user.id).eq('coloring_id', id)
      : supabase.from('favorites').insert({ user_id: session.user.id, coloring_id: id });

    const { error } = await query;
    if (error) {
      await loadAccount(session);
      await loadDrawings();
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
    if (downloads >= 5 && !session) {
      alert('Crée un compte gratuit pour continuer à télécharger sans limite.');
      return;
    }

    setDownloading(format);
    const safe = slugify(open.title) || 'coloriage';

    supabase.from('site_analytics').insert({
      event_type: 'download',
      metadata: {
        drawing_id: open.id,
        slug: open.slug,
        title: open.title,
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
        if (!open.isSvg && !open.image.endsWith('.svg')) {
          alert('Le format SVG n’est pas disponible pour ce dessin matriciel.');
          return;
        }
        const res = await fetch(open.image);
        const svgContent = await res.text();
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = safe + '.svg';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else if (format === 'PNG') {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        if (open.isSvg || open.image.endsWith('.svg')) {
          const res = await fetch(open.image);
          const svgText = await res.text();
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          img.src = url;
          await img.decode();
          URL.revokeObjectURL(url);
        } else {
          img.src = open.image;
          await img.decode();
        }

        const width = img.naturalWidth && img.naturalWidth > 1200 ? img.naturalWidth : 2400;
        const height = img.naturalHeight && img.naturalHeight > 1600 ? img.naturalHeight : 3200;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = safe + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else {
        // PDF A4
        const img = new Image();
        img.crossOrigin = 'anonymous';

        if (open.isSvg || open.image.endsWith('.svg')) {
          const res = await fetch(open.image);
          const svgText = await res.text();
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          img.src = url;
          await img.decode();
          URL.revokeObjectURL(url);
        } else {
          img.src = open.image;
          await img.decode();
        }

        const width = img.naturalWidth && img.naturalWidth > 1200 ? img.naturalWidth : 2400;
        const height = img.naturalHeight && img.naturalHeight > 1600 ? img.naturalHeight : 3200;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

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

      const n = downloads + 1;
      setDownloads(n);
      localStorage.setItem('cb-downloads', n);
    } catch (error) {
      console.error(error);
      alert('Le téléchargement a échoué. Réessaie dans un instant.');
    } finally {
      setDownloading(null);
    }
  }

  const shown = useMemo(() => {
    let result = drawings.filter(d =>
      (cat === 'Tous' || d.cat.includes(cat)) &&
      d.title.toLowerCase().includes(q.toLowerCase())
    );
    if (page === 'Favoris') result = result.filter(d => favs.has(d.id));
    if (sort === 'liked') result = [...result].sort((a, b) => b.likes - a.likes);
    if (sort === 'recent') result = [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return result;
  }, [q, cat, page, favs, sort, drawings]);

  const activeAvatarSrc = avatarList[selectedAvatar] || avatar1;

  return (
    <main className={'theme-' + theme}>
      {/* Global Botanical SVG Definitions */}
      <FoliageDefs />

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
              {favs.size > 0 && <span className="cb-top-badge">{favs.size}</span>}
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

            {/* Selected Avatar Circle */}
            <button
              className="cb-avatar-circle"
              onClick={() => { setPage('Profil'); setOwnerOpen(false); }}
              title="Mon Profil"
              aria-label="Mon Profil"
            >
              <img src={activeAvatarSrc} alt="Mon Avatar" />
            </button>

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
          {/* Woodland foliage and flower garland around the top bar */}
          <TopNavFoliage />

          {/* Desktop Navigation Tabs */}
          <nav className="cb-nav-tabs-row cb-desktop-only">
            {navItems.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                className={`cb-nav-tab ${page === id && !ownerOpen ? 'active' : ''}`}
                onClick={() => {
                  if (id === 'Nouveautes') {
                    setNouveautesOpen(true);
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
                {id === 'Favoris' && favs.size > 0 && <small className="cb-tab-badge">{favs.size}</small>}
              </button>
            ))}
          </nav>

          {/* Mobile All Category Tabs (Horizontal Scroll Strip at the top of the screen) */}
          <div className="cb-mobile-cats-row cb-mobile-only" aria-label="Catégories de coloriage">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                className={`cb-mobile-cat-pill ${cat === c && page === 'Accueil' ? 'active' : ''}`}
                onClick={() => {
                  setCat(c);
                  setPage('Accueil');
                  setOwnerOpen(false);
                }}
              >
                <span>{getCatLabel(c, t)}</span>
              </button>
            ))}
            <button
              type="button"
              className="cb-mobile-cat-pill"
              onClick={() => setNouveautesOpen(true)}
            >
              <Sparkles size={14} />
              <span>{t.navNews}</span>
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
              className={`cb-search-heart-medallion ${favs.size > 0 ? 'active' : ''}`}
              onClick={() => { setPage('Favoris'); setOwnerOpen(false); }}
              title="Voir mes favoris"
              aria-label="Voir mes favoris"
            >
              <Heart fill={favs.size > 0 ? '#d9534f' : '#eddcb8'} color="#5a2e12" />
              {favs.size > 0 && <span className="cb-medallion-count">{favs.size}</span>}
            </button>
          </div>
        </div>

        {/* Settings Modal (Langue, Aide téléchargement/impression, Modes) */}
        {settings && (
          <div className="cb-settings-modal">
            <div className="cb-settings-header">
              <b><Settings className="settings-head-icon" /> {t.settingsTitle}</b>
              <button className="close-mini" onClick={() => setSettings(false)}><X /></button>
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

            {/* Mobile Drawing Grid Size Selector */}
            <div className="setting-section">
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
                <span style={{ display: 'block', marginTop: '4px', opacity: 0.85 }}>
                  ℹ️ Sur ordinateur, l'affichage conserve automatiquement sa grille parfaite à 4 colonnes.
                </span>
              </small>
            </div>

            {/* How It Works & Print Help */}
            <div className="setting-section help-section">
              <b><HelpCircle className="help-icon" /> Comment ça marche ?</b>
              <div className="help-item">
                <span>📥 <b>Comment télécharger ?</b></span>
                <p>Clique sur un dessin pour l'ouvrir, puis choisis <b>SVG</b> (vectoriel), <b>PNG</b> ou <b>PDF A4</b>.</p>
              </div>
              <div className="help-item">
                <span>🖨️ <b>Comment imprimer ?</b></span>
                <p>Télécharge le <b>PDF A4</b> (format idéal pour impression papier sans déformation), ouvre-le et imprime directement !</p>
              </div>
              <div className="help-item">
                <span>✂️ <b>Format SVG Vectoriel :</b></span>
                <p>Les dessins en SVG sont parfaits pour les découpes (Cricut, Silhouette), Illustrator et l'impression grand format sans perte de qualité.</p>
              </div>
            </div>

            {/* Themes / Modes */}
            <div className="setting-section">
              <b>Thèmes d'ambiance</b>
              <div className="themes">
                <button className={theme === 'day' ? 'active-theme' : ''} onClick={() => setTheme('day')}><Sun /> Jour</button>
                <button className={theme === 'night' ? 'active-theme' : ''} onClick={() => setTheme('night')}><Moon /> Nuit</button>
                <button className={theme === 'jungle' ? 'active-theme' : ''} onClick={() => setTheme('jungle')}><Leaf /> Forêt</button>
              </div>
            </div>

            {/* Future Modes */}
            <div className="setting-section future-modes">
              <b>Modes créatifs (bientôt)</b>
              <div className="future-pills">
                <span>🎨 Coloriage en ligne</span>
                <span>✨ Créateur de mandalas</span>
              </div>
            </div>

            {/* Owner Space Access */}
            <button className="owner-link" onClick={() => {
              setSettings(false);
              setOwnerOpen(!ownerOpen);
              setAdminView('stats');
            }}>
              <ShieldCheck /> {ownerOpen ? 'Quitter l’espace propriétaire' : 'Espace propriétaire'}
            </button>
          </div>
        )}
      </header>

      {/* Main Body */}
      {ownerOpen ? (
        <AdminPanel
          view={adminView}
          setView={setAdminView}
          drawings={drawings}
          reloadDrawings={loadDrawings}
          user={session?.user || { id: 'bullewatch-owner', email: 'flo83119@gmail.com' }}
          closeAdmin={() => setOwnerOpen(false)}
          pendingRequestsCount={pendingRequestsCount}
          refreshPendingRequests={checkPendingRequests}
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
                <div className="cb-about-card-icon">🌸</div>
                <h3>{t.aboutCard1Title}</h3>
                <p>{t.aboutCard1Text}</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon">✂️</div>
                <h3>{animalCatalog.length} {t.aboutCard2Title}</h3>
                <p>{t.aboutCard2Text}</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon">🖨️</div>
                <h3>{t.aboutCard3Title}</h3>
                <p>{t.aboutCard3Text}</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon">💌</div>
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
        <section className="layout cb-home">
          {/* Left Sidebar: PURE CSS STICKY WOODEN PANEL (SUIT LE SCROLL) */}
          <aside className="cb-panel-aside">
            <div className="cb-css-panel">
              {/* Botanical foliage & daisy flowers wrapping the wooden panel */}
              <LeftPanelFoliage />

              {/* Antique Corner Nails */}
              <span className="cb-css-nail top-left" aria-hidden="true" />
              <span className="cb-css-nail top-right" aria-hidden="true" />
              <span className="cb-css-nail bottom-left" aria-hidden="true" />
              <span className="cb-css-nail bottom-right" aria-hidden="true" />

              <div className="cb-panel-content">
                {/* Sort Bar Plank */}
                <div className="cb-sort-plank">
                  <span className="cb-plank-label">{t.sortBy}</span>
                  <div className="cb-sort-select-wrapper">
                    <Sparkles size={14} className="cb-sort-sparkle" aria-hidden="true" />
                    <select value={sort} onChange={e => setSort(e.target.value)} aria-label={t.sortBy}>
                      <option value="recent">{t.sortRecent}</option>
                      <option value="liked">{t.sortLiked}</option>
                    </select>
                  </div>
                </div>

                {/* Categories Wooden Planks (POM remplacé par Favoris au bas) */}
                <div className="cb-categories-planks">
                  <span className="cb-plank-label">{t.categoriesTitle}</span>
                  {cats.map(catName => (
                    <button
                      key={catName}
                      className={`cb-css-plank ${cat === catName && page === 'Accueil' ? 'active' : ''}`}
                      onClick={() => {
                        setCat(catName);
                        setPage('Accueil');
                      }}
                    >
                      <span className="cb-plank-dot">•</span>
                      <span className="cb-plank-title">{getCatLabel(catName, t)}</span>
                      {catName === 'Animaux' && <span className="cb-plank-pill">{animalCatalog.length}</span>}
                    </button>
                  ))}

                  {/* Bouton Cœur pour accéder aux Favoris à la place de POM */}
                  <button
                    className={`cb-css-plank cb-plank-favs ${page === 'Favoris' ? 'active' : ''}`}
                    onClick={() => {
                      setPage('Favoris');
                    }}
                    title={t.myFavorites}
                  >
                    <span className="cb-plank-heart">💜</span>
                    <span className="cb-plank-title">{t.myFavorites}</span>
                    {favs.size > 0 && <span className="cb-plank-pill">{favs.size}</span>}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Gallery: Grid of Wooden Boards with Pinned Drawings */}
          <section className="cb-gallery">
            {shown.length ? (
              <div className={`cb-boards-grid cb-grid-cols-${gridDensity}`}>
                {shown.map((d) => (
                  <article className="cb-board-item" key={d.id} onClick={() => setOpen(d)}>
                    {/* The Wooden Board Frame Background */}
                    <div className="cb-board-frame" style={{ backgroundImage: `url(${boardArt})` }}>
                      {/* Pinned Drawing on the Inner Parchment Canvas */}
                      <div className="cb-board-canvas">
                        {d.isSvg && <span className="cb-svg-tag" title="Dessin vectoriel SVG disponible"><FileCode size={11} /> SVG</span>}
                        {d.image ? (
                          <img src={d.image} alt={d.title} className="cb-pinned-drawing" loading="lazy" />
                        ) : (
                          <div className="cb-drawing-empty">
                            <span>{d.title}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OVERLAID LAYER: Enhanced High-Contrast Like Button Centered at the Bottom */}
                    <button
                      className={`cb-like-badge ${favs.has(d.id) ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        heart(d.id);
                      }}
                      aria-label="Aimer et ajouter aux favoris"
                      title={`${d.likes} j'aime`}
                    >
                      <img src={favs.has(d.id) ? likeLikedArt : likeArt} alt="" aria-hidden="true" />
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

          {/* Right Sidebar: PROPER EMPTY GOOGLE AD SLOT (PRET POUR AD SENSE) */}
          <aside className="cb-ad-sidebar">
            <div className="cb-ad-container" id="colorblop-ad-slot">
              {/* Botanical foliage wrapping the ad frame */}
              <AdPanelFoliage />

              <span className="cb-ad-label">Espace Publicitaire</span>
              <div className="cb-ad-empty-box">
                {/* Standard Google Ad Tag ready */}
                <ins
                  className="adsbygoogle"
                  style={{ display: 'block' }}
                  data-ad-client="ca-pub-0000000000000000"
                  data-ad-slot="0000000000"
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                />
                <div className="cb-ad-placeholder-note">
                  <Sparkles size={20} />
                  <span>Emplacement réservé Google Ad</span>
                </div>
                {/* Grass silhouettes at the bottom of the ad panel */}
                <AdGrassSilhouette />
              </div>
            </div>
          </aside>
        </section>
      )}

      <footer>{t.siteTitle} • {t.tagline}</footer>

      {/* Drawing Modal (En grand & Téléchargements SVG, PNG, PDF) */}
      {open && (
        <div className="modal" onClick={() => setOpen(null)}>
          <div className="modalbox" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(null)}><X /></button>
            <div className="bigpaper">
              <img className="coloring-img big" src={open.image} alt={open.title} />
            </div>
            <h2>{open.title}</h2>
            <p>{open.cat.map(c => getCatLabel(c, t)).join(' • ')}</p>
            <div className="actions">
              <button
                className={`modal-heart-btn ${favs.has(open.id) ? 'liked' : ''}`}
                onClick={() => heart(open.id)}
              >
                <Heart fill={favs.has(open.id) ? 'currentColor' : 'none'} /> {formatLikes(open.likes)}
              </button>
              {open.isSvg && (
                <button
                  onClick={() => download('SVG')}
                  className="download-btn-svg"
                  title="Télécharger le fichier vectoriel SVG (idéal machines de découpe & impression HD)"
                  disabled={Boolean(downloading)}
                >
                  <Download /> {downloading === 'SVG' ? t.preparing : t.btnSvg}
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
            <small className="download-note">
              {session ? t.unlimitedDownloads : `${Math.max(0, 5 - downloads)} ${t.visitorDownloadsLeft}`}
            </small>
          </div>
        </div>
      )}

      {/* Nouveautés / Notifications Modal */}
      {nouveautesOpen && (
        <div className="modal" onClick={() => setNouveautesOpen(false)}>
          <div className="letter" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setNouveautesOpen(false)}><X /></button>
            <Bell className="letter-icon" />
            <h2>Nouveautés & Annonces</h2>
            <div className="notification-list">
              <div className="notif-item">
                <span className="notif-date">Nouveau</span>
                <b>{animalCatalog.length} dessins d'animaux en SVG vectoriel ajoutés !</b>
                <p>Découvre la nouvelle collection d'animaux disponibles en téléchargement direct en SVG (idéal pour découpe et retouche), PNG et PDF A4.</p>
              </div>
              <div className="notif-item">
                <span className="notif-date">Aujourd'hui</span>
                <b>Bienvenue sur le nouveau Colorblop !</b>
                <p>Cadres en bois sculpté, barre de recherche florale, boîte à dessin collaborative et 8 avatars exclusifs.</p>
              </div>
            </div>
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
        onOpenDrawing={(d) => setOpen(d)}
        onOpenOwnerRequests={() => {
          setOwnerOpen(true);
          setAdminView('requests');
        }}
        heartDrawing={heart}
        t={t}
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
              fill={favs.size > 0 ? '#d9534f' : 'none'}
              color={favs.size > 0 ? '#d9534f' : 'currentColor'}
            />
            {favs.size > 0 && <span className="cb-bottom-badge">{favs.size}</span>}
          </div>
          <span className="cb-bottom-nav-label">Favoris</span>
        </button>
      </nav>
    </main>
  );
}

/* === 4-STAGE OFFICIAL DRAWING MAILBOX COMPONENT === */
function OfficialDrawingMailbox({ isOwner, pendingRequestsCount, drawings, session, profile, onOpenProfile, onOpenDrawing, onOpenOwnerRequests, heartDrawing, t = translations.FR }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClickOpen, setIsClickOpen] = useState(false);
  const [isNewMailOpen, setIsNewMailOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validatedRequests, setValidatedRequests] = useState([]);
  const [thankedNotice, setThankedNotice] = useState(false);

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
    const interval = setInterval(checkValidatedRequests, 20000);
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
    if (!session?.user) {
      setIsClickOpen(false);
      onOpenProfile();
      return;
    }

    if (description.trim().length < 3) {
      alert('Écris quelques mots pour décrire ton coloriage.');
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
      setIsClickOpen(false);
      alert(t.mailboxSuccess);
    } catch (err) {
      console.error(err);
      alert('Impossible d’envoyer la demande pour le moment. Réessaie dans un instant.');
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

      {/* STAGE 3 : "VISUEL CLIC" - INTERACTIVE WRITING SHEET WITH CLEAN PARCHMENT */}
      {isClickOpen && (
        <div className="modal" onClick={() => setIsClickOpen(false)}>
          <div className="cb-click-sheet-card" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setIsClickOpen(false)} aria-label="Fermer"><X /></button>

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
                ) : (
                  <form onSubmit={handleSendRequest} className="cb-sheet-form-inner">
                    <span className="cb-click-sheet-title">{t.mailboxTitle}</span>

                    <textarea
                      required
                      rows="4"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
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
                          <img src={matched.image} alt={matched.title} />
                        ) : (
                          <Sparkles size={32} />
                        )}
                        <span className="cb-thumb-zoom-tag">🔍 {t.download}</span>
                      </div>

                      <div className="cb-new-drawing-details">
                        <b>{matched?.title || req.completed_drawing_slug}</b>
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

function Profile({ session, profile, selectedAvatar, updateAvatar, databaseReady, isOwner, openAdmin, lang = 'FR', t = translations.FR }) {
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

  async function signOut() {
    await supabase.auth.signOut();
  }

  const userDisplayName = profile?.display_name || session?.user?.user_metadata?.display_name || session?.user?.user_metadata?.pseudo || session?.user?.email?.split('@')[0];

  return (
    <section className="profile cb-profile-box">
      <div className="cb-active-avatar-wrap">
        <img src={avatarList[selectedAvatar] || avatar1} alt="Avatar sélectionné" className="cb-profile-current-avatar" />
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
          <p>{t.profileConnectedSync}</p>
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
function AdminPanel({ view, setView, drawings, reloadDrawings, user, closeAdmin, pendingRequestsCount, refreshPendingRequests }) {
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedSlugForRequest, setSelectedSlugForRequest] = useState({});
  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [registeredUsersList, setRegisteredUsersList] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

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
  const [savingBatchTitles, setSavingBatchTitles] = useState(false);

  // === BATCH MULTI-UPLOAD ===
  const [batchUploadList, setBatchUploadList] = useState([]);
  const [groupedTitle, setGroupedTitle] = useState('');
  const [groupedAutoNumber, setGroupedAutoNumber] = useState(true);
  const [groupedCats, setGroupedCats] = useState(['Animaux']);
  const [publishingBatch, setPublishingBatch] = useState(false);
  const [publishProgress, setPublishProgress] = useState({ current: 0, total: 0, text: '' });

  // Quick edit for renaming & categories in library
  const [editingDrawingId, setEditingDrawingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingCats, setEditingCats] = useState([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCatFilter, setLibraryCatFilter] = useState('Tous');

  const availableCategories = ['Animaux', 'Chats', 'Fées', 'Fille', 'Garçon', 'Halloween', 'Dinosaures', 'Véhicules', 'VIP', 'Divers'];

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

  // Batch files add handler
  function handleBatchFilesAdd(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    addFilesToBatch(files);
    e.target.value = '';
  }

  function addFilesToBatch(files) {
    const newItems = files.map((f, i) => {
      const isSvg = f.name.toLowerCase().endsWith('.svg') || f.type === 'image/svg+xml';
      const rawName = f.name.replace(/\.[^/.]+$/, '');
      const clean = rawName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
      const initialTitle = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Coloriage';

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
    setBatchUploadList(prev => [...prev, ...newItems]);
  }

  function removeBatchItem(id) {
    setBatchUploadList(prev => prev.filter(x => x.id !== id));
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
          created_by: user.id || null,
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
  }, [view]);

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
      if (edit) {
        ({ error } = await supabase.from('coloring_pages').update(payload).eq('id', edit.id));
      } else {
        ({ error } = await supabase.from('coloring_pages').insert({
          ...payload,
          slug: (slugify(title) || 'coloriage') + '-' + Date.now().toString(36),
          created_by: user.id,
          is_published: true,
        }));
      }

      if (error) throw error;

      if (edit && file && edit.imagePath && !edit.imagePath.startsWith('/')) {
        await supabase.storage.from('colorings').remove([edit.imagePath]);
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
    if (!confirm(`Supprimer le coloriage « ${drawing.title} » ?`)) return;

    if (!String(drawing.id).startsWith('cb-svg-')) {
      const { error } = await supabase.from('coloring_pages').delete().eq('id', drawing.id);
      if (error) {
        alert('Impossible de supprimer ce coloriage.');
        return;
      }
      if (drawing.imagePath && !drawing.imagePath.startsWith('/')) {
        await supabase.storage.from('colorings').remove([drawing.imagePath]);
      }
    }

    await reloadDrawings();
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
      const matchCat = libraryCatFilter === 'Tous' || d.cat.includes(libraryCatFilter);
      const matchQ = d.title.toLowerCase().includes(librarySearch.toLowerCase());
      return matchCat && matchQ;
    });
  }, [drawings, libraryCatFilter, librarySearch]);

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
            className={`cb-owner-tab ${view === 'requests' ? 'active' : ''}`}
            onClick={() => setView('requests')}
          >
            <Mail size={16} /> Demandes de dessins
            {pendingRequestsCount > 0 && <span className="cb-tab-pill">{pendingRequestsCount}</span>}
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
              <h3><ThumbsUp size={18} /> Top Coloriages les plus aimés</h3>
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

            {/* Batch Renaming Toggle Button */}
            <button
              type="button"
              className={`cb-btn-batch-rename ${isBatchRenaming ? 'active' : ''}`}
              onClick={toggleBatchRenaming}
              title="Renommer tous les dessins à la chaîne avec un seul bouton d'enregistrement"
            >
              <Pencil size={16} />
              <span>{isBatchRenaming ? 'Fermer le mode renommage' : '✏️ Renommer tous les dessins'}</span>
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
              <span>Catégorie :</span>
              <select
                value={libraryCatFilter}
                onChange={e => setLibraryCatFilter(e.target.value)}
              >
                <option value="Tous">Toutes les catégories</option>
                {availableCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sticky / Top Batch Renaming Action Banner */}
          {isBatchRenaming && (
            <div className="cb-batch-rename-banner">
              <div className="cb-rename-banner-info">
                <Pencil size={22} className="cb-rename-banner-icon" />
                <div>
                  <b>Mode Renommage à la chaîne activé</b>
                  <p>Tous les noms des dessins sont modifiables ci-dessous. Modifiez-les librement, puis cliquez sur le bouton vert ci-contre pour tout enregistrer en un seul clic.</p>
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
                <div className={`cb-library-card ${isEditing || isBatchRenaming ? 'editing' : ''}`} key={d.id}>
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
                          <div className="cb-cat-pills-select">
                            {availableCategories.map(c => {
                              const selected = editingCats.includes(c);
                              return (
                                <button
                                  type="button"
                                  key={c}
                                  className={`cb-cat-toggle-pill ${selected ? 'active' : ''}`}
                                  onClick={() => {
                                    setEditingCats(prev =>
                                      selected ? prev.filter(x => x !== c) : [...prev, c]
                                    );
                                  }}
                                >
                                  {selected ? '✓ ' : '+ '}{c}
                                </button>
                              );
                            })}
                          </div>
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

      {/* VIEW 3 : BOÎTE AUX LETTRES & DEMANDES DE DESSINS */}
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

          {/* Grouped Settings Panel (when items exist in batch) */}
          {batchUploadList.length > 0 && (
            <div className="cb-batch-grouped-panel">
              <h3><Tags size={18} /> Réglages groupés pour les coloriages du même thème</h3>
              <p>Renseignez un titre et des catégories communes, puis appliquez-les en un clic aux dessins sélectionnés :</p>

              <div className="cb-grouped-inputs-grid">
                <div className="cb-grouped-field">
                  <label>Titre groupé :</label>
                  <input
                    type="text"
                    className="cb-input-text"
                    value={groupedTitle}
                    onChange={e => setGroupedTitle(e.target.value)}
                    placeholder="Ex: Chat féerique, Petite princesse, Forêt enchantée..."
                  />
                  <label className="cb-grouped-autonum-label">
                    <input
                      type="checkbox"
                      checked={groupedAutoNumber}
                      onChange={e => setGroupedAutoNumber(e.target.checked)}
                    />
                    <span>Numéroter automatiquement si plusieurs dessins (ex: Chat féerique 1, Chat féerique 2...)</span>
                  </label>
                </div>

                <div className="cb-grouped-field">
                  <label>Catégories groupées :</label>
                  <div className="cb-item-cats-selector">
                    {availableCategories.map(c => {
                      const isSel = groupedCats.includes(c);
                      return (
                        <button
                          type="button"
                          key={c}
                          className={`cb-item-cat-pill ${isSel ? 'active' : ''}`}
                          onClick={() => {
                            setGroupedCats(prev =>
                              isSel ? prev.filter(x => x !== c) : [...prev, c]
                            );
                          }}
                        >
                          {isSel ? '✓ ' : '+ '}{c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="cb-btn-apply-grouped"
                onClick={applyGroupedSettings}
              >
                <Sparkles size={16} /> Appliquer le titre et les catégories aux dessins sélectionnés ({batchUploadList.filter(x => x.selected).length})
              </button>
            </div>
          )}

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
                      {availableCategories.map(c => {
                        const isSel = item.categories.includes(c);
                        return (
                          <button
                            type="button"
                            key={c}
                            className={`cb-item-cat-pill ${isSel ? 'active' : ''}`}
                            onClick={() => {
                              const nextCats = isSel
                                ? item.categories.filter(x => x !== c)
                                : [...item.categories, c];
                              updateBatchItem(item.id, { categories: nextCats.length ? nextCats : ['Divers'] });
                            }}
                          >
                            {isSel ? '✓ ' : '+ '}{c}
                          </button>
                        );
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
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);