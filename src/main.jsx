import React, { useEffect, useMemo, useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import {
  Search, Heart, Settings, Download, X, Leaf, Globe2, Moon, Sun,
  LogIn, Mail, Send, ShieldCheck, BarChart3, Plus, FolderOpen, Tags,
  Megaphone, UploadCloud, Trash2, Pencil, CheckCircle2, LogOut, UserPlus,
  Home, Sparkles, Info, BookOpen, HelpCircle, Bell, FileCode, Check,
  Clock, PackageCheck, Eye, TrendingUp, ThumbsUp, ArrowRight, CheckCheck
} from 'lucide-react';
import './styles.css';
import { supabase, coloringImageUrl } from './supabase';
import { animalCatalog } from './animalCatalog';

import floralComposition from '../assets/floral-composition.png';
import logoArt from '../assets/logo-tight.png';
import boardArt from '../assets/board-tight.png';
import likeArt from '../assets/like-tight.png';
import favorisArt from '../assets/favoris-tight.png';
import settingsArt from '../assets/settings-tight.png';
import pomCardArt from '../assets/pom-card.png';

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

const navItems = [
  { id: 'Accueil', label: 'Accueil', icon: Home },
  { id: 'Catégorie', label: 'Catégories', icon: Leaf },
  { id: 'Favoris', label: 'Favoris', icon: Heart },
  { id: 'VIP', label: 'VIP', icon: Sparkles, badge: 'Bientôt' },
  { id: 'POM', label: 'POM', icon: BookOpen, badge: 'Livre' },
  { id: 'Messages', label: 'Messages', icon: Mail, badge: '1' },
  { id: 'APropos', label: 'À propos', icon: Info },
];

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
  const [lang, setLang] = useState('FR');
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [downloads, setDownloads] = useState(Number(localStorage.getItem('cb-downloads') || 0));
  const [downloading, setDownloading] = useState(null);
  const [adminView, setAdminView] = useState('stats');
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(() => Number(localStorage.getItem('cb-avatar') || 0));
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const cats = ['Tous', 'Animaux', 'Chats', 'Fées', 'Fille', 'Garçon', 'Halloween', 'Dinosaures', 'Véhicules', 'POM'];

  // Check if current user is owner/admin
  const isOwner = Boolean(
    profile?.is_admin ||
    session?.user?.email?.toLowerCase().includes('bullewatch')
  );

  async function loadDrawings() {
    const { data, error } = await supabase
      .from('coloring_pages')
      .select('id,slug,title,categories,image_path,likes_count,downloads_count,is_published,created_at')
      .order('created_at', { ascending: false });

    const dbDrawings = (data || []).map(toDrawing);
    const existingSlugs = new Set(dbDrawings.map(d => d.slug));
    const combined = [
      ...dbDrawings,
      ...animalCatalog.filter(a => !existingSlugs.has(a.slug)),
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
    }
    setFavs(new Set((favoriteData || []).map(x => x.coloring_id)));
  }

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

    // Track download in analytics & increment count in Supabase
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
        if (open.isSvg || open.image.endsWith('.svg')) {
          const res = await fetch(open.image);
          const svgContent = await res.text();
          const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = safe + '.svg';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        } else {
          const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100"><image href="${open.image}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/></svg>`;
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = safe + '.svg';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
      } else if (format === 'PNG') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = open.image;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1200;
        canvas.height = img.naturalHeight || 1600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
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
        img.src = open.image;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1200;
        canvas.height = img.naturalHeight || 1600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
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
    if (page === 'POM') result = result.filter(d => d.cat.some(c => c.toLowerCase() === 'pom'));
    if (sort === 'liked') result = [...result].sort((a, b) => b.likes - a.likes);
    if (sort === 'recent') result = [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return result;
  }, [q, cat, page, favs, sort, drawings]);

  const activeAvatarSrc = avatarList[selectedAvatar] || avatar1;

  return (
    <main className={'theme-' + theme}>
      {/* Top Floral Composition Canopy */}
      <div className="cb-floral-canopy">
        <img src={floralComposition} alt="" aria-hidden="true" />
      </div>

      {/* Main Header */}
      <header className="cb-header">
        <div className="cb-header-top">
          {/* Centered Large COLORBLOOM Banner */}
          <div className="cb-logo-wrap" onClick={() => { setPage('Accueil'); setOwnerOpen(false); }}>
            <img src={logoArt} alt="ColorBloom" className="cb-logo" />
          </div>

          {/* Top-Right: Favoris, Avatar & Settings */}
          <div className="cb-top-actions">
            {/* Favoris Button */}
            <button
              className={`cb-top-btn cb-fav-top-btn ${page === 'Favoris' ? 'active' : ''}`}
              onClick={() => { setPage('Favoris'); setOwnerOpen(false); }}
              title="Mes Favoris"
              aria-label="Mes Favoris"
            >
              <img src={favorisArt} alt="Favoris" />
              {favs.size > 0 && <span className="cb-top-badge">{favs.size}</span>}
            </button>

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

        {/* UNIFIED NAV & SEARCH ASSEMBLY (GLUED TOGETHER WITH DRAPING FLOWERS) */}
        <div className="cb-nav-search-assembly">
          {/* Decorative Floral Overlays on the Sides and Joint */}
          <div className="cb-assembly-flower-left" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="36" height="36">
              <path d="M12,22 C6,18 4,10 12,6 C20,2 24,12 20,20 Z" fill="#4d723b" />
              <circle cx="24" cy="22" r="10" fill="#fff" stroke="#4a3018" strokeWidth="2" />
              <circle cx="24" cy="22" r="4" fill="#f7b731" />
            </svg>
          </div>
          <div className="cb-assembly-flower-right" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="36" height="36">
              <path d="M28,22 C34,18 36,10 28,6 C20,2 16,12 20,20 Z" fill="#4d723b" />
              <circle cx="16" cy="22" r="10" fill="#fff" stroke="#4a3018" strokeWidth="2" />
              <circle cx="16" cy="22" r="4" fill="#f7b731" />
            </svg>
          </div>

          {/* Navigation Categories Row (Upper Part of the Assembly) */}
          <nav className="cb-nav-plank">
            {navItems.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                className={`cb-nav-tab ${page === id && !ownerOpen ? 'active' : ''}`}
                onClick={() => {
                  if (id === 'Messages') {
                    setMessagesOpen(true);
                    return;
                  }
                  if (id === 'VIP') {
                    setVipOpen(true);
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

          {/* Search Bar Log (Lower Part of the Assembly, Seamlessly Glued) */}
          <div className="cb-search-log">
            <div className="cb-search-field">
              <Search className="cb-loupe-icon" />
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Rechercher un coloriage (animaux, fées, etc.)..."
                aria-label="Rechercher un coloriage"
              />
              {q && (
                <button className="cb-search-clear" onClick={() => setQ('')} aria-label="Effacer">
                  <X />
                </button>
              )}
            </div>

            {/* Medallion Heart on the Right of the Search Bar */}
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
              <b><Settings className="settings-head-icon" /> Réglages & Aide</b>
              <button className="close-mini" onClick={() => setSettings(false)}><X /></button>
            </div>

            {/* Language Choice */}
            <div className="setting-section">
              <label>
                <Globe2 /> Langue
                <select value={lang} onChange={e => setLang(e.target.value)}>
                  <option value="FR">Français (FR)</option>
                  <option value="EN">English (EN)</option>
                  <option value="ES">Español (ES)</option>
                  <option value="DE">Deutsch (DE)</option>
                </select>
              </label>
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
          user={session?.user || { id: 'bullewatch-owner', email: 'bullewatch+colorbloom@gmail.com' }}
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
        />
      ) : page === 'APropos' ? (
        /* Clean and Highly Legible À Propos Section without Huge Avatar */
        <section className="cb-about-clean">
          <div className="cb-about-parchment">
            <div className="cb-about-header">
              <Sparkles className="cb-about-sparkle" />
              <h1>À propos de ColorBloom</h1>
              <p className="cb-about-tagline">L'univers enchanté des coloriages et dessins vectoriels gratuits à imprimer</p>
            </div>

            <div className="cb-about-content">
              <div className="cb-about-card">
                <div className="cb-about-card-icon">🌸</div>
                <h3>Un univers créatif et poétique</h3>
                <p>ColorBloom est né pour offrir aux enfants, aux parents et aux passionnés d'art un espace doux, chaleureux et féerique. Chaque planche de coloriage est créée pour stimuler la créativité, apporter le calme et célébrer la beauté de la nature.</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon">✂️</div>
                <h3>126 Dessins en SVG Vectoriel</h3>
                <p>Nouveau sur ColorBloom : tous nos dessins d'animaux sont désormais disponibles en <b>téléchargement SVG vectoriel natif</b> ! Vous pouvez les agrandir à l'infini sans perte de qualité et les utiliser avec vos machines de découpe (Cricut, Silhouette), Illustrator ou traceurs.</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon">🖨️</div>
                <h3>Téléchargement et impression faciles</h3>
                <p>Chaque coloriage est proposé en 3 formats au choix : <b>PDF A4</b> idéal pour une impression propre et nette à la maison, <b>PNG haute résolution</b>, et <b>SVG vectoriel</b>. Tout est pensé pour être accessible en un clic.</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon">🍄</div>
                <h3>Les aventures de POM</h3>
                <p>Découvrez également l'univers attachant de <b>POM</b>, le petit personnage bienveillant de nos livres illustrés pour les tout-petits, disponible sur Amazon & Kindle avec ses histoires et coloriages exclusifs.</p>
              </div>

              <div className="cb-about-card">
                <div className="cb-about-card-icon">💌</div>
                <h3>La Boîte à dessin participative</h3>
                <p>Une idée d'animal ou de créature que tu aimerais colorier ? Dépose ta lettre dans la <b>Boîte à dessin</b> située en bas à droite de l'écran. L'artiste lit vos demandes et vous notifie directement avec le dessin une fois créé !</p>
              </div>
            </div>

            <div className="cb-about-footer-note">
              <button className="cb-about-back-btn" onClick={() => setPage('Accueil')}>
                ← Retourner aux coloriages
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="layout cb-home">
          {/* Left Sidebar: PURE CSS HAND-CARVED WOODEN PANEL */}
          <aside className="cb-panel-aside">
            <div className="cb-css-panel">
              {/* Antique Corner Nails */}
              <span className="cb-css-nail top-left" aria-hidden="true" />
              <span className="cb-css-nail top-right" aria-hidden="true" />
              <span className="cb-css-nail bottom-left" aria-hidden="true" />
              <span className="cb-css-nail bottom-right" aria-hidden="true" />

              <div className="cb-panel-content">
                {/* Sort Bar Plank */}
                <div className="cb-sort-plank">
                  <span className="cb-plank-label">Trier par :</span>
                  <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Trier par">
                    <option value="recent">✨ Plus récents</option>
                    <option value="liked">❤️ Plus aimés</option>
                  </select>
                </div>

                {/* Categories Wooden Planks */}
                <div className="cb-categories-planks">
                  <span className="cb-plank-label">Catégories</span>
                  {cats.map(catName => (
                    <button
                      key={catName}
                      className={`cb-css-plank ${cat === catName && page === 'Accueil' ? 'active' : ''}`}
                      onClick={() => {
                        setCat(catName);
                        setPage('Accueil');
                      }}
                    >
                      <span className="cb-plank-nail" aria-hidden="true" />
                      <span className="cb-plank-title">{catName}</span>
                      {catName === 'Animaux' && <span className="cb-plank-pill">126</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Center Gallery: Grid of Wooden Boards with Pinned Drawings */}
          <section className="cb-gallery">
            {shown.length ? (
              <div className="cb-boards-grid">
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
                      <img src={likeArt} alt="" aria-hidden="true" />
                      <span className="cb-like-count">{formatLikes(d.likes)}</span>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cb-empty-board">
                <Heart />
                <h2>{page === 'POM' ? 'Le coin de Pom' : page === 'Favoris' ? 'Aucun favori pour le moment' : 'Ce jardin est encore vide'}</h2>
                <p>
                  {page === 'POM'
                    ? 'Les coloriages officiels de Pom arrivent très bientôt ! Découvre déjà le premier livre de Pom ci-contre.'
                    : page === 'Favoris'
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

          {/* Right Sidebar: Pom Book Banner */}
          <aside className="cb-ad-sidebar">
            <div className="cb-pom-box">
              <img src={pomCardArt} alt="Découvre la nature avec POM" className="cb-pom-banner" />
              <a
                href="https://www.amazon.fr"
                target="_blank"
                rel="noreferrer"
                className="cb-pom-click"
                title="Découvrir le livre Pom et le papillon sur Amazon & Kindle"
              >
                <span className="sr-only">Voir le livre Pom</span>
              </a>
            </div>
          </aside>
        </section>
      )}

      <footer>ColorBloom • Des coloriages et fichiers SVG gratuits pour laisser fleurir l'imagination</footer>

      {/* Drawing Modal (En grand & Téléchargements SVG, PNG, PDF) */}
      {open && (
        <div className="modal" onClick={() => setOpen(null)}>
          <div className="modalbox" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(null)}><X /></button>
            <div className="bigpaper">
              <img className="coloring-img big" src={open.image} alt={open.title} />
            </div>
            <h2>{open.title}</h2>
            <p>{open.cat.join(' • ')}</p>
            <div className="actions">
              <button
                className={`modal-heart-btn ${favs.has(open.id) ? 'liked' : ''}`}
                onClick={() => heart(open.id)}
              >
                <Heart fill={favs.has(open.id) ? 'currentColor' : 'none'} /> {formatLikes(open.likes)}
              </button>
              <button onClick={() => download('SVG')} className="download-btn-svg" title="Télécharger le fichier vectoriel SVG">
                <Download /> {downloading === 'SVG' ? 'Préparation…' : 'SVG'}
              </button>
              <button onClick={() => download('PNG')}>
                <Download /> {downloading === 'PNG' ? 'Préparation…' : 'PNG'}
              </button>
              <button onClick={() => download('PDF')}>
                <Download /> {downloading === 'PDF' ? 'Préparation…' : 'PDF A4'}
              </button>
            </div>
            <small className="download-note">
              {session ? 'Compte connecté : téléchargements sans limite.' : `${Math.max(0, 5 - downloads)} téléchargement(s) visiteur restant(s) avant création de compte.`}
            </small>
          </div>
        </div>
      )}

      {/* Official Notifications / Messages Modal */}
      {messagesOpen && (
        <div className="modal" onClick={() => setMessagesOpen(false)}>
          <div className="letter" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setMessagesOpen(false)}><X /></button>
            <Bell className="letter-icon" />
            <h2>Messages & Notifications</h2>
            <div className="notification-list">
              <div className="notif-item">
                <span className="notif-date">Nouveau</span>
                <b>126 dessins d'animaux en SVG vectoriel ajoutés !</b>
                <p>Découvre la nouvelle collection d'animaux disponibles en téléchargement direct en SVG (idéal pour découpe et retouche), PNG et PDF A4.</p>
              </div>
              <div className="notif-item">
                <span className="notif-date">Aujourd'hui</span>
                <b>Bienvenue sur le nouveau ColorBloom !</b>
                <p>Cadres en bois sculpté, barre de recherche florale, boîte à dessin collaborative et 8 avatars exclusifs.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIP Announcement Modal */}
      {vipOpen && (
        <div className="modal" onClick={() => setVipOpen(false)}>
          <div className="letter" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setVipOpen(false)}><X /></button>
            <Sparkles className="letter-icon" />
            <h2>Espace VIP en préparation</h2>
            <p>L'espace VIP vous offrira bientôt des coloriages exclusifs en très haute résolution, un accès en avant-première aux nouveaux tomes de POM et des fonctionnalités inédites !</p>
            <button className="send" onClick={() => setVipOpen(false)}>Compris !</button>
          </div>
        </div>
      )}

      {/* 4-STAGE INTERACTIVE MAILBOX WIDGET (IN BOTTOM-RIGHT CORNER) */}
      <OfficialDrawingMailbox
        isOwner={isOwner}
        pendingRequestsCount={pendingRequestsCount}
        drawings={drawings}
        session={session}
        onOpenDrawing={(d) => setOpen(d)}
        onOpenOwnerRequests={() => {
          setOwnerOpen(true);
          setAdminView('requests');
        }}
        heartDrawing={heart}
      />
    </main>
  );
}

/* === 4-STAGE OFFICIAL DRAWING MAILBOX COMPONENT === */
function OfficialDrawingMailbox({ isOwner, pendingRequestsCount, drawings, session, onOpenDrawing, onOpenOwnerRequests, heartDrawing }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClickOpen, setIsClickOpen] = useState(false);
  const [isNewMailOpen, setIsNewMailOpen] = useState(false);
  const [pseudo, setPseudo] = useState(() => localStorage.getItem('cb-user-pseudo') || '');
  const [email, setEmail] = useState(() => session?.user?.email || '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validatedRequests, setValidatedRequests] = useState([]);
  const [thankedNotice, setThankedNotice] = useState(false);

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

  // Determine which image to show
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
    if (description.trim().length < 3) {
      alert('Écris quelques mots pour décrire ton coloriage.');
      return;
    }

    setSubmitting(true);
    const finalPseudo = pseudo.trim() || 'Ami de ColorBloom';
    localStorage.setItem('cb-user-pseudo', finalPseudo);

    try {
      const { data, error } = await supabase.from('coloring_requests').insert({
        user_id: session?.user?.id || null,
        pseudo: finalPseudo,
        email: email.trim() || null,
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
      alert('🌸 Ta lettre a été déposée dans la boîte ! L’artiste prépare tes futurs coloriages.');
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
          alt="Boîte aux lettres ColorBloom"
          className="cb-mailbox-img"
        />

        {/* Small sparkling alert badge when new mail is present */}
        {showNewMailVisual && (
          <span className="cb-mailbox-alert-badge">
            ✉️ {hasOwnerMail ? pendingRequestsCount : validatedRequests.length}
          </span>
        )}
      </div>

      {/* STAGE 3 : "VISUEL CLIC" - INTERACTIVE WRITING SHEET */}
      {isClickOpen && (
        <div className="modal" onClick={() => setIsClickOpen(false)}>
          <div className="cb-click-sheet-card" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setIsClickOpen(false)} aria-label="Fermer"><X /></button>

            {/* The Visual Clic Artwork */}
            <div className="cb-sheet-artwork-wrapper">
              <img src={mailboxClick} alt="Fais une demande de dessin ici" className="cb-sheet-artwork" />

              {/* Seamless Interactive Form Overlay directly on the lined writing box */}
              <form onSubmit={handleSendRequest} className="cb-sheet-interactive-overlay">
                <input
                  type="text"
                  required
                  value={pseudo}
                  onChange={e => setPseudo(e.target.value)}
                  placeholder="Ton prénom ou pseudo…"
                  className="cb-sheet-input-pseudo"
                />

                <textarea
                  required
                  rows="3"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Décris le dessin que tu aimerais : un animal, une fée, une scène magique…"
                  className="cb-sheet-textarea"
                />

                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ton e-mail (optionnel, pour te prévenir)"
                  className="cb-sheet-input-email"
                />

                <button
                  type="submit"
                  className="cb-sheet-send-btn"
                  disabled={submitting}
                  title="Glisser dans la boîte aux lettres"
                >
                  <Send size={18} />
                  <span>{submitting ? 'Envoi…' : 'Envoyer'}</span>
                </button>
              </form>
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
              <h2>Nouveau courrier dans ta boîte !</h2>
              <p>L’artiste a réalisé et ajouté ton coloriage sur ColorBloom :</p>
            </div>

            {thankedNotice ? (
              <div className="cb-thank-you-msg">
                🌸 <b>De rien !</b> Merci pour ton message, amuse-toi bien avec ton coloriage !
              </div>
            ) : (
              <div className="cb-new-drawings-list">
                {validatedRequests.map(req => {
                  const matched = drawings.find(d => d.slug === req.completed_drawing_slug);
                  return (
                    <div className="cb-new-drawing-item" key={req.id}>
                      {/* Miniature thumbnail that directly leads to the drawing modal */}
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
                        <span className="cb-thumb-zoom-tag">🔍 Télécharger</span>
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
                              <Download size={14} /> Page de téléchargement (SVG, PNG, PDF)
                            </button>
                          )}

                          {/* The Clickable "Merci !" button */}
                          <button
                            className="cb-btn-merci"
                            onClick={() => handleThankYou(req.id, matched?.id)}
                            title="Remercier l'artiste et ajouter un cœur au dessin"
                          >
                            <Heart size={14} fill="#e74c3c" color="#9b1b1b" /> Dire Merci !
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

function Profile({ session, profile, selectedAvatar, updateAvatar, databaseReady, isOwner, openAdmin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function signIn() {
    if (!email || !password) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(error ? error.message : 'Connexion réussie.');
  }

  async function signUp() {
    if (!email || password.length < 6) {
      setMessage('Utilise un e-mail valide et un mot de passe d’au moins 6 caractères.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: email.split('@')[0] } },
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else if (!data.session) setMessage('Compte créé. Vérifie ton e-mail pour confirmer ton inscription.');
    else setMessage('Compte créé et connecté.');
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <section className="profile cb-profile-box">
      <div className="cb-active-avatar-wrap">
        <img src={avatarList[selectedAvatar] || avatar1} alt="Avatar sélectionné" className="cb-profile-current-avatar" />
      </div>

      <h1>{profile?.display_name || (session ? 'Mon jardin ColorBloom' : 'Bienvenue sur ColorBloom')}</h1>
      {session && <p className="cb-profile-email">{session.user.email}</p>}

      {/* 8 Custom Avatars Selection Grid */}
      <div className="cb-avatar-selection">
        <h3>Choisis ton avatar parmi les 8 créations officielles :</h3>
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
        <div className="auth-card">
          <p>Connecte-toi avec ton adresse e-mail pour sauvegarder tes favoris ou gérer ton espace propriétaire :</p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton adresse e-mail" autoComplete="email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" autoComplete="current-password" />
          <div className="auth-actions">
            <button onClick={signIn} disabled={busy}><LogIn /> Se connecter</button>
            <button onClick={signUp} disabled={busy}><UserPlus /> Créer un compte</button>
          </div>
          {message && <p className="auth-message">{message}</p>}
          {!databaseReady && <p className="auth-message">Base ColorBloom connectée.</p>}
        </div>
      ) : (
        <div className="cb-profile-actions">
          <p>Ton profil et tes favoris sont synchronisés en direct avec la base de données Supabase.</p>
          {isOwner && (
            <button className="cb-btn-admin" onClick={openAdmin}>
              <ShieldCheck /> Accéder à mon espace propriétaire
            </button>
          )}
          <button className="cb-btn-logout" onClick={signOut}><LogOut /> Se déconnecter</button>
        </div>
      )}
    </section>
  );
}

/* === OWNER / ADMIN SPACE CONNECTED TO SUPABASE WITH STATS & DRAWINGS MANAGEMENT === */
function AdminPanel({ view, setView, drawings, reloadDrawings, user, closeAdmin, pendingRequestsCount, refreshPendingRequests }) {
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedSlugForRequest, setSelectedSlugForRequest] = useState({});
  const [analyticsEvents, setAnalyticsEvents] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Form for adding drawing
  const [edit, setEdit] = useState(null);
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick edit for renaming & categories in library
  const [editingDrawingId, setEditingDrawingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingCats, setEditingCats] = useState([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCatFilter, setLibraryCatFilter] = useState('Tous');

  const availableCategories = ['Animaux', 'Chats', 'Fées', 'Fille', 'Garçon', 'Halloween', 'Dinosaures', 'Véhicules', 'POM', 'VIP', 'Divers'];

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
      const { data, error } = await supabase
        .from('site_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (!error && data) {
        setAnalyticsEvents(data);
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
  }

  function choose(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
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
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const base = slugify(title) || 'coloriage';
        uploadedPath = `${Date.now()}-${base}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('colorings')
          .upload(uploadedPath, file, { contentType: file.type, upsert: false });

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

    // If drawing exists in Supabase coloring_pages
    if (!String(d.id).startsWith('cb-svg-')) {
      const { error } = await supabase
        .from('coloring_pages')
        .update({
          title: editingTitle.trim(),
          categories: editingCats.length ? editingCats : ['Divers']
        })
        .eq('id', d.id);

      if (error) {
        alert('Impossible de mettre à jour le dessin dans Supabase.');
        return;
      }
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
  const totalDownloads = drawings.reduce((acc, d) => acc + (d.downloads || 0), 0) +
    analyticsEvents.filter(e => e.event_type === 'download').length;
  const totalLikes = drawings.reduce((acc, d) => acc + (d.likes || 0), 0);
  const totalColorings = drawings.length;
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
            <h1>Espace Propriétaire ColorBloom</h1>
            <p>Connecté avec Supabase • {user.email || 'bullewatch+colorbloom@gmail.com'}</p>
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
          <div className="cb-stats-kpi-grid">
            <div className="cb-kpi-card">
              <span className="cb-kpi-icon downloads"><Download size={22} /></span>
              <div className="cb-kpi-val">{totalDownloads}</div>
              <div className="cb-kpi-label">Téléchargements totaux</div>
            </div>

            <div className="cb-kpi-card">
              <span className="cb-kpi-icon likes"><Heart size={22} fill="#e74c3c" color="#e74c3c" /></span>
              <div className="cb-kpi-val">{formatLikes(totalLikes)}</div>
              <div className="cb-kpi-label">J'aimes comptabilisés</div>
            </div>

            <div className="cb-kpi-card">
              <span className="cb-kpi-icon count"><Leaf size={22} /></span>
              <div className="cb-kpi-val">{totalColorings}</div>
              <div className="cb-kpi-label">Coloriages actifs au catalogue</div>
            </div>

            <div className="cb-kpi-card">
              <span className="cb-kpi-icon requests"><Mail size={22} /></span>
              <div className="cb-kpi-val">{pendingRequestsCount}</div>
              <div className="cb-kpi-label">Demandes en attente de dessin</div>
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
                      <span>{d.cat.join(', ')}</span>
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
        </div>
      )}

      {/* VIEW 2 : GÉRER LES DESSINS (PANEL AVEC RENOMMAGE ET RANGEMENT PAR CATÉGORIES) */}
      {view === 'library' && (
        <div className="cb-owner-view-library">
          {/* Header Action Bar */}
          <div className="cb-library-actions-bar">
            {/* Big Prominent + Button */}
            <button
              className="cb-btn-add-primary"
              onClick={() => { resetForm(); setView('add'); }}
            >
              <Plus size={18} /> Ajouter un coloriage
            </button>

            {/* Quick Search */}
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

            {/* Quick Category Filter */}
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

          <p className="cb-library-count-info">
            Affichage de <b>{filteredLibraryDrawings.length}</b> coloriages :
          </p>

          {/* Grid of drawings with inline rename and category tag changer */}
          <div className="cb-library-grid">
            {filteredLibraryDrawings.map(d => {
              const isEditing = editingDrawingId === d.id;
              return (
                <div className={`cb-library-card ${isEditing ? 'editing' : ''}`} key={d.id}>
                  <div className="cb-lib-thumb">
                    <img src={d.image} alt={d.title} />
                    {d.isSvg && <span className="cb-svg-tag">SVG</span>}
                  </div>

                  <div className="cb-lib-body">
                    {isEditing ? (
                      /* Inline Rename Form */
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
                        <div className="cb-lib-meta">
                          <span>❤️ {formatLikes(d.likes)}</span>
                          <span>📥 {d.downloads || 0}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && (
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
                      <span className="cb-req-author">👤 <b>{req.pseudo || 'Visiteur anonyme'}</b></span>
                      {req.email && <span className="cb-req-email">✉️ {req.email}</span>}
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

      {/* VIEW 4 : AJOUTER UN COLORIAGE */}
      {view === 'add' && (
        <div className="cb-owner-view-add">
          <h2><Plus /> Ajouter un nouveau coloriage</h2>
          <p>Téléverse ton image (PNG, JPG, WEBP ou SVG vectoriel) directement vers Supabase Storage.</p>

          <div className="cb-add-form-layout">
            <div className="upload-zone">
              <UploadCloud size={44} />
              <b>{preview ? 'Fichier sélectionné' : 'Choisis ton fichier coloriage'}</b>
              <span>PNG, JPG, SVG ou WEBP</span>
              <label className="file-pick">
                Parcourir les fichiers
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={choose} />
              </label>
              {preview && <img className="admin-preview" src={preview} alt="Aperçu" />}
            </div>

            <div className="admin-form">
              <label>
                Nom du coloriage :
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex. Petit écureuil gourmand sous la lune"
                />
              </label>

              <label>
                Catégories (séparées par une virgule) :
                <input
                  value={categories}
                  onChange={e => setCategories(e.target.value)}
                  placeholder="Animaux, Forêt, Enfants…"
                />
              </label>

              <button className="publish" onClick={save} disabled={saving}>
                <CheckCircle2 /> {saving ? 'Enregistrement dans Supabase…' : edit ? 'Enregistrer les modifications' : 'Publier le coloriage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);