import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import {
  Search, Heart, Settings, Download, X, Leaf, Globe2, Moon, Sun,
  LogIn, Mail, Send, ShieldCheck, BarChart3, Plus, FolderOpen, Tags,
  Megaphone, UploadCloud, Trash2, Pencil, CheckCircle2, LogOut, UserPlus,
  Home, Sparkles, Info, User
} from 'lucide-react';
import './styles.css';
import { supabase, coloringImageUrl } from './supabase';
import floralTop from '../assets/floral-top.png';
import colorBloomLogo from '../assets/colorbloom-logo.png';
import categoryPanel from '../assets/category-panel.png';
import heartArt from '../assets/heart.png';
import settingsArt from '../assets/settings.png';
import woodFrameArt from '../assets/wood-frame-window.png';
import avatarFairy from '../assets/avatar-fairy.png';
import pomCardArt from '../assets/pom-card.png';

const fallbackDrawings = [];

const navItems = [
  { name: 'Accueil', icon: Home },
  { name: 'Catégories', icon: Leaf },
  { name: 'Favoris', icon: Heart },
  { name: 'Nouveautés', icon: Sparkles },
  { name: 'Infos', icon: Info },
  { name: 'Profil', icon: User },
];

const avatars = ['🧚', '🧝', '🧙', '🧝‍♀️', '🧙‍♂️', '🍄', '🌿', '🧑‍🌾'];

function toDrawing(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    cat: row.categories || [],
    likes: row.likes_count || 0,
    imagePath: row.image_path,
    image: coloringImageUrl(row.image_path),
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
  const [drawings, setDrawings] = useState(fallbackDrawings);
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
  const [downloads, setDownloads] = useState(Number(localStorage.getItem('cb-downloads') || 0));
  const [downloading, setDownloading] = useState(null);
  const [adminView, setAdminView] = useState('dashboard');
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(() => Number(localStorage.getItem('cb-avatar') || 0));
  const cats = ['Tous', 'Fées', 'Halloween', 'Fille', 'Garçon', 'Véhicules', 'Dinosaures', 'Animaux', 'Chats'];

  const admin = Boolean(profile?.is_admin);

  async function loadDrawings() {
    const { data, error } = await supabase
      .from('coloring_pages')
      .select('id,slug,title,categories,image_path,likes_count,is_published,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('ColorBloom: Supabase catalog unavailable, using built-in drawings.', error.message);
      setDatabaseReady(false);
      return;
    }

    setDatabaseReady(true);
    setDrawings((data || []).map(toDrawing));
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

    // Update persistent likes count in Supabase
    const targetDrawing = drawings.find(d => d.id === id);
    if (targetDrawing) {
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
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = open.image;
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const safe = slugify(open.title) || 'coloriage';

      if (format === 'PNG') {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = safe + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else {
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
    if (page === 'Nouveautés') result = result.filter(d => d.fresh);
    if (sort === 'liked') result = [...result].sort((a, b) => b.likes - a.likes);
    if (sort === 'recent') result = [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return result;
  }, [q, cat, page, favs, sort, drawings]);

  return (
    <main className={'theme-' + theme}>
      {/* Top floral canopy */}
      <div className="cb-floral-canopy">
        <img src={floralTop} alt="" aria-hidden="true" />
      </div>

      {/* Main Header */}
      <header className="cb-header">
        <div className="cb-header-top">
          <div className="cb-logo-wrap" aria-label="ColorBloom">
            <img src={colorBloomLogo} alt="ColorBloom" className="cb-logo" />
          </div>

          {/* Top-Right Profile Avatar & Settings Button */}
          <div className="cb-top-actions">
            <button
              className="cb-avatar-btn"
              onClick={() => { setPage('Profil'); setOwnerOpen(false); }}
              title="Mon profil"
              aria-label="Mon profil"
            >
              <img src={avatarFairy} alt="Profil" />
            </button>
            <button
              className="cb-settings-btn"
              onClick={() => setSettings(!settings)}
              title="Réglages"
              aria-label="Réglages"
            >
              <img src={settingsArt} alt="Réglages" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="cb-nav">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`cb-nav-tab ${page === name && !ownerOpen ? 'active' : ''}`}
              onClick={() => {
                setPage(name);
                setOwnerOpen(false);
                if (name === 'Catégories') setCat('Tous');
              }}
            >
              <Icon className="cb-tab-icon" />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        {/* Search Bar with Heart badge */}
        <div className="cb-search-bar">
          <div className="cb-search-input-wrap">
            <Search className="cb-search-icon" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher des coloriages"
            />
            {q && (
              <button className="cb-search-clear" onClick={() => setQ('')} aria-label="Effacer la recherche">
                <X />
              </button>
            )}
          </div>
          <button
            className={`cb-search-heart ${page === 'Favoris' ? 'active' : ''}`}
            onClick={() => { setPage('Favoris'); setOwnerOpen(false); }}
            title="Voir mes favoris"
            aria-label="Voir mes favoris"
          >
            <img src={heartArt} alt="" />
            {favs.size > 0 && <span className="cb-search-fav-count">{favs.size}</span>}
          </button>
        </div>

        {/* Settings Dropdown */}
        {settings && (
          <div className="cb-settings-modal">
            <b>Réglages</b>
            <label>
              <Globe2 /> Langue
              <select value={lang} onChange={e => setLang(e.target.value)}>
                <option>FR</option><option>EN</option><option>中文</option><option>RU</option>
              </select>
            </label>
            <div className="themes">
              <button onClick={() => setTheme('day')}><Sun /> Jour</button>
              <button onClick={() => setTheme('night')}><Moon /> Nuit</button>
              <button onClick={() => setTheme('jungle')}><Leaf /> Jungle</button>
            </div>
            <button className="request" onClick={() => { setRequestOpen(true); setSettings(false); }}>
              Faire une demande de coloriage
            </button>
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

      {/* Main Content Area */}
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
      ) : page === 'Infos' ? (
        <section className="info">
          <h1>Comment ça marche ?</h1>
          <p>Choisis un coloriage, ouvre-le en grand puis télécharge-le en PNG ou PDF A4 gratuit.</p>
          <p>Avec un compte, tes favoris et ton profil sont synchronisés entre tous tes appareils.</p>
        </section>
      ) : (
        <section className="layout cb-home">
          {/* Left Sidebar: Wooden Category Panel */}
          <aside className="cb-wood-panel" style={{ backgroundImage: `url(${categoryPanel})` }}>
            <div className="cb-wood-content">
              <h3 className="cb-wood-title">Trier par</h3>
              <div className="cb-sort-pill">
                <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Trier par">
                  <option value="recent">Ajoutés récemment</option>
                  <option value="liked">Les plus aimés</option>
                </select>
              </div>

              <h3 className="cb-wood-title cb-cats-title">Catégories</h3>
              <div className="cb-cats-list">
                {cats.map(catName => (
                  <button
                    key={catName}
                    className={`cb-cat-btn ${cat === catName && page === 'Accueil' ? 'active' : ''}`}
                    onClick={() => {
                      setCat(catName);
                      setPage('Accueil');
                    }}
                  >
                    {catName}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center Gallery: 5-Column Grid of Empty / Populated Wooden Frames */}
          <section className="cb-gallery">
            {shown.length ? (
              <div className="cb-grid">
                {shown.map((d) => (
                  <article className="cb-card" key={d.id} onClick={() => setOpen(d)}>
                    <div className="cb-card-frame">
                      {/* Parchment background + coloring image */}
                      <div className="cb-card-canvas">
                        {d.image ? (
                          <img src={d.image} alt={d.title} className="cb-coloring-thumb" loading="lazy" />
                        ) : (
                          <div className="cb-coloring-empty">
                            <span>{d.title}</span>
                          </div>
                        )}
                      </div>

                      {/* Corner hanging vine detail */}
                      <div className="cb-corner-hanger" />

                      {/* Overlaid wooden frame with transparent window */}
                      <img src={woodFrameArt} alt="" className="cb-wood-frame-border" aria-hidden="true" />
                    </div>

                    {/* OVERLAID HEART BUTTON CALQUE AU-DESSUS */}
                    <button
                      className={`cb-heart-overlay ${favs.has(d.id) ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        heart(d.id);
                      }}
                      aria-label="Ajouter aux favoris"
                      title={`${d.likes} favoris`}
                    >
                      <img src={heartArt} alt="" aria-hidden="true" />
                      <span className="cb-heart-count">{d.likes}</span>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cb-empty">
                <Heart />
                <h2>Ce jardin est encore vide</h2>
                <p>Aucun coloriage ne correspond à ta recherche ou à tes filtres.</p>
                {(q || cat !== 'Tous' || page !== 'Accueil') && (
                  <button
                    className="cb-reset-filters"
                    onClick={() => { setQ(''); setCat('Tous'); setPage('Accueil'); }}
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Right Sidebar: Pom Book Promotion Card */}
          <aside className="cb-ad-sidebar">
            <div className="cb-pom-card">
              <img src={pomCardArt} alt="Découvre la nature avec POM" className="cb-pom-img" />
              <a
                href="https://www.amazon.fr"
                target="_blank"
                rel="noreferrer"
                className="cb-pom-link"
                title="Découvrir le livre Pom et le papillon"
              >
                <span className="sr-only">Voir le livre Pom</span>
              </a>
            </div>
          </aside>
        </section>
      )}

      <footer>ColorBloom • Des coloriages pour laisser fleurir l'imagination</footer>

      {/* Drawing Modal (En grand & Téléchargement) */}
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
                <Heart fill={favs.has(open.id) ? 'currentColor' : 'none'} /> {open.likes}
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

  if (!session) {
    return (
      <section className="profile">
        <div className="avatar">{avatars[selectedAvatar]}</div>
        <h1>Mon jardin ColorBloom</h1>
        <p>Crée un compte ou connecte-toi pour retrouver tes favoris et ton profil sur tous tes appareils.</p>

        <div className="auth-card">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton e-mail" autoComplete="email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" autoComplete="current-password" />
          <div className="auth-actions">
            <button onClick={signIn} disabled={busy}><LogIn /> Se connecter</button>
            <button onClick={signUp} disabled={busy}><UserPlus /> Créer un compte</button>
          </div>
          {message && <p className="auth-message">{message}</p>}
          {!databaseReady && <p className="auth-message">La base ColorBloom doit encore être initialisée dans Supabase avant la première connexion.</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="profile">
      <div className="avatar">{avatars[selectedAvatar]}</div>
      <h1>{profile?.display_name || 'Mon jardin ColorBloom'}</h1>
      <p>{session.user.email}</p>

      <div className="avatar-picker">
        {avatars.map((av, i) => (
          <button key={i} className={selectedAvatar === i ? 'selected' : ''} onClick={() => updateAvatar(i)}>{av}</button>
        ))}
      </div>

      <p>Ton profil et tes favoris sont maintenant sauvegardés dans ColorBloom.</p>
      {admin && <button onClick={openAdmin}><ShieldCheck /> Ouvrir l’espace propriétaire</button>}
      <button onClick={signOut}><LogOut /> Se déconnecter</button>
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
