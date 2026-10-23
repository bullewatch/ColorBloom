import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import {
  Search, Heart, Settings, Download, X, Leaf, Globe2, Moon, Sun,
  LogIn, Mail, Send, ShieldCheck, BarChart3, Plus, FolderOpen, Tags,
  Megaphone, UploadCloud, Trash2, Pencil, CheckCircle2, LogOut, UserPlus,
  Home, Sparkles, Info, User, BookOpen, Printer, HelpCircle, Bell, FileCode
} from 'lucide-react';
import './styles.css';
import { supabase, coloringImageUrl } from './supabase';
import { animalCatalog } from './animalCatalog';

import floralComposition from '../assets/floral-composition.png';
import logoArt from '../assets/Logo.png';
import boardArt from '../assets/board-tight.png';
import panelArt from '../assets/panel-tight.png';
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

const avatarList = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8];

const navItems = [
  { id: 'Accueil', label: 'Accueil', icon: Home },
  { id: 'Catégorie', label: 'Catégories', icon: Leaf },
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
  const [requestOpen, setRequestOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [downloads, setDownloads] = useState(Number(localStorage.getItem('cb-downloads') || 0));
  const [downloading, setDownloading] = useState(null);
  const [adminView, setAdminView] = useState('dashboard');
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(() => Number(localStorage.getItem('cb-avatar') || 0));
  const cats = ['Tous', 'Animaux', 'Chats', 'Fées', 'Fille', 'Garçon', 'Halloween', 'Dinosaures', 'Véhicules'];

  const admin = Boolean(profile?.is_admin);

  async function loadDrawings() {
    const { data, error } = await supabase
      .from('coloring_pages')
      .select('id,slug,title,categories,image_path,likes_count,is_published,created_at')
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

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadAccount(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadAccount(nextSession);
    });

    return () => authListener.subscription.unsubscribe();
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

    // Synchronize likes_count with Supabase if stored
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
      {/* Top Floral Composition */}
      <div className="cb-floral-canopy">
        <img src={floralComposition} alt="" aria-hidden="true" />
      </div>

      {/* Main Header */}
      <header className="cb-header">
        <div className="cb-header-top">
          {/* Centered Logo */}
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

        {/* Navigation Categories Row */}
        <nav className="cb-nav">
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
            </button>
          ))}
        </nav>

        {/* Search Bar with Magnifying Glass and Input Field */}
        <div className="cb-search-bar">
          <div className="cb-search-parchment">
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

            {/* Drawing Request */}
            <button className="request" onClick={() => { setRequestOpen(true); setSettings(false); }}>
              Faire une demande de coloriage
            </button>

            {/* Owner Space Access */}
            <button className="owner-link" onClick={() => {
              setSettings(false);
              if (admin) {
                setOwnerOpen(!ownerOpen);
                setAdminView('dashboard');
              } else {
                setPage('Profil');
                setOwnerOpen(false);
              }
            }}>
              <ShieldCheck /> {admin ? (ownerOpen ? 'Quitter l’espace propriétaire' : 'Espace propriétaire') : 'Connexion propriétaire'}
            </button>
          </div>
        )}
      </header>

      {/* Main Body */}
      {ownerOpen && admin ? (
        <AdminPanel
          view={adminView}
          setView={setAdminView}
          drawings={drawings}
          reloadDrawings={loadDrawings}
          user={session.user}
        />
      ) : page === 'Profil' ? (
        <Profile
          session={session}
          profile={profile}
          selectedAvatar={selectedAvatar}
          updateAvatar={updateAvatar}
          databaseReady={databaseReady}
          admin={admin}
          openAdmin={() => { setOwnerOpen(true); setAdminView('dashboard'); }}
        />
      ) : page === 'APropos' ? (
        <section className="info cb-about">
          <h1>À propos de ColorBloom</h1>
          <p>ColorBloom est un univers enchanté de coloriages gratuits et de dessins vectoriels SVG à imprimer pour enfants et adultes.</p>
          <p>Chaque planche est conçue pour laisser fleurir la créativité et le calme à travers la nature, les fées et les personnages magiques.</p>
          <div className="about-author">
            <img src={avatarList[0]} alt="Auteur" className="about-avatar" />
            <div>
              <b>Créé avec passion</b>
              <p>Retrouve aussi les livres et aventures de <b>POM</b> dans notre univers !</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="layout cb-home">
          {/* Left Panel: Wooden Plank Category Menu */}
          <aside className="cb-panel-aside">
            <div className="cb-panel-wood" style={{ backgroundImage: `url(${panelArt})` }}>
              <div className="cb-panel-content">
                <div className="cb-sort-bar">
                  <span className="cb-plank-label">Trier par :</span>
                  <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Trier par">
                    <option value="recent">Récents</option>
                    <option value="liked">Favoris</option>
                  </select>
                </div>

                <div className="cb-categories-planks">
                  <span className="cb-plank-label">Catégories</span>
                  {cats.map(catName => (
                    <button
                      key={catName}
                      className={`cb-plank-btn ${cat === catName && page === 'Accueil' ? 'active' : ''}`}
                      onClick={() => {
                        setCat(catName);
                        setPage('Accueil');
                      }}
                    >
                      <span className="cb-nail" />
                      <span className="cb-plank-text">{catName}</span>
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

                    {/* OVERLAID LAYER: Like Button Centered at the Bottom Over the Drawing */}
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
                <p>Nouveaux cadres en bois, bouton like avec compteur 1k, 8 avatars personnalisés et fond forêt optimisé.</p>
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

      {/* Coloring Request Modal */}
      {requestOpen && <RequestModal close={() => setRequestOpen(false)} session={session} />}
    </main>
  );
}

function Profile({ session, profile, selectedAvatar, updateAvatar, databaseReady, admin, openAdmin }) {
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
          <p>Connecte-toi pour sauvegarder tes favoris et ton profil sur tous tes appareils :</p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton e-mail" autoComplete="email" />
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
          <p>Ton profil et tes favoris sont synchronisés en direct avec la base de données.</p>
          {admin && <button className="cb-btn-admin" onClick={openAdmin}><ShieldCheck /> Ouvrir l’espace propriétaire</button>}
          <button className="cb-btn-logout" onClick={signOut}><LogOut /> Se déconnecter</button>
        </div>
      )}
    </section>
  );
}

function RequestModal({ close, session }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(session?.user?.email || '');
  const [description, setDescription] = useState('');

  async function submit() {
    if (description.trim().length < 3) {
      alert('Décris un peu plus le coloriage que tu aimerais.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('coloring_requests').insert({
      user_id: session?.user?.id || null,
      email: email.trim() || null,
      description: description.trim(),
    });
    setBusy(false);
    if (error) {
      alert('La demande n’a pas pu être envoyée pour le moment.');
      return;
    }
    setSent(true);
  }

  return (
    <div className="modal" onClick={close}>
      <div className="letter" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={close}><X /></button>
        {sent ? (
          <>
            <Mail className="letter-icon" />
            <h2>Ta demande est partie !</h2>
            <p>Elle est enregistrée dans l’espace propriétaire.</p>
          </>
        ) : (
          <>
            <h2>Une idée de coloriage ?</h2>
            <p>Décris le dessin ou le thème que tu aimerais voir sur ColorBloom.</p>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton e-mail" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex. Une petite fée qui jardine avec un hérisson…" />
            <button className="send" onClick={submit} disabled={busy}><Send /> {busy ? 'Envoi…' : 'Envoyer ma demande'}</button>
          </>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ view, setView, drawings, reloadDrawings, user }) {
  const [edit, setEdit] = useState(null);
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

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

  function begin(d) {
    setEdit(d);
    setTitle(d.title);
    setCategories(d.cat.join(', '));
    setFile(null);
    setPreview(d.image);
    setView('add');
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

      const cats = categories.split(',').map(x => x.trim()).filter(Boolean);
      const payload = {
        title: title.trim(),
        categories: cats.length ? cats : ['Divers'],
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
      alert('Impossible d’enregistrer ce coloriage. Vérifie les droits Supabase puis réessaie.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(drawing) {
    if (!confirm('Supprimer ce coloriage ?')) return;

    const { error } = await supabase.from('coloring_pages').delete().eq('id', drawing.id);
    if (error) {
      alert('Impossible de supprimer ce coloriage.');
      return;
    }

    if (drawing.imagePath && !drawing.imagePath.startsWith('/')) {
      await supabase.storage.from('colorings').remove([drawing.imagePath]);
    }
    await reloadDrawings();
  }

  if (view === 'add') {
    return (
      <AdminShell title={edit ? 'Modifier le coloriage' : 'Ajouter un coloriage'} back={() => { resetForm(); setView('dashboard'); }}>
        <div className="upload-zone">
          <UploadCloud />
          <b>{preview ? 'Image sélectionnée' : 'Ajoute ton coloriage'}</b>
          <span>JPG, PNG ou WEBP</span>
          <label className="file-pick">
            Choisir une image
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose} />
          </label>
          {preview && <img className="admin-preview" src={preview} alt="Aperçu" />}
        </div>

        <div className="admin-form">
          <label>
            Nom du coloriage
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Petite fée dans un jardin" />
          </label>
          <label>
            Catégories
            <input value={categories} onChange={e => setCategories(e.target.value)} placeholder="Fées, Nature, Enfants…" />
          </label>
          <button className="publish" onClick={save} disabled={saving}>
            <CheckCircle2 /> {saving ? 'Enregistrement…' : edit ? 'Enregistrer les modifications' : 'Ajouter le coloriage'}
          </button>
        </div>
      </AdminShell>
    );
  }

  if (view === 'library') {
    return (
      <AdminShell title="Mes coloriages" back={() => setView('dashboard')}>
        <button className="publish" onClick={() => { resetForm(); setView('add'); }}><Plus /> Ajouter un coloriage</button>
        <div className="library-list">
          {drawings.map(d => (
            <div className="library-row" key={d.id}>
              <div className="mini"><img src={d.image} alt={d.title} /></div>
              <div><b>{d.title}</b><span>{d.cat.join(' • ')}</span></div>
              <div className="row-actions">
                <button onClick={() => begin(d)} aria-label="Modifier"><Pencil /></button>
                <button onClick={() => remove(d)} aria-label="Supprimer"><Trash2 /></button>
              </div>
            </div>
          ))}
        </div>
      </AdminShell>
    );
  }

  const items = [
    ['Ajouter un coloriage', Plus, 'Image, nom et catégories', 'add'],
    ['Mes coloriages', FolderOpen, 'Modifier ou supprimer', 'library'],
    ['Demandes reçues', Mail, 'Stockées dans Supabase', 'requests'],
    ['Catégories', Tags, 'À développer', 'categories'],
    ['Publicités', Megaphone, 'À développer', 'ads'],
    ['Statistiques', BarChart3, 'À développer', 'stats'],
  ];

  return (
    <section className="admin">
      <div className="admin-head">
        <ShieldCheck />
        <div><h1>Jardinier ColorBloom</h1><p>Espace propriétaire sécurisé par Supabase</p></div>
      </div>
      <div className="admin-grid">
        {items.map(([t, Icon, d, v]) => (
          <button key={t} onClick={() => setView(v)}>
            <Icon /><b>{t}</b><span>{d}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AdminShell({ title, back, children }) {
  return (
    <section className="admin admin-sub">
      <button className="back" onClick={back}>← Tableau de bord</button>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
