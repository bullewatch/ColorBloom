import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import {
  Search, Heart, Settings, Download, X, Leaf, Globe2, Moon, Sun,
  LogIn, Mail, Send, ShieldCheck, BarChart3, Plus, FolderOpen, Tags,
  Megaphone, UploadCloud, Trash2, Pencil, CheckCircle2, LogOut, UserPlus
} from 'lucide-react';
import './styles.css';
import { supabase, coloringImageUrl } from './supabase';
import floralTop from '../floral-top.png';
import colorBloomLogo from '../colorbloom-logo.png';
import navigationSearch from '../navigation-search.jpg';
import categoryPanel from '../category-panel.jpg';
import heartArt from '../heart.jpg';
import settingsArt from '../settings.jpg';
import coloring01 from '../coloring-01.jpg';
import coloring02 from '../coloring-02.jpg';
import coloring03 from '../coloring-03.jpg';
import coloring04 from '../coloring-04.jpg';

const fallbackDrawings = [
  { id: 'fallback-1', slug: 'portrait-au-ruban', title: 'Portrait au ruban', cat: ['Fille'], likes: 184, image: coloring01, imagePath: coloring01 },
  { id: 'fallback-2', slug: 'jeune-fille-aux-grands-yeux', title: 'Jeune fille aux grands yeux', cat: ['Fille'], likes: 263, image: coloring02, imagePath: coloring02 },
  { id: 'fallback-3', slug: 'jeune-fille-souriante', title: 'Jeune fille souriante', cat: ['Fille'], likes: 151, image: coloring03, imagePath: coloring03 },
  { id: 'fallback-4', slug: 'petit-chat-au-chapeau', title: 'Petit chat au chapeau', cat: ['Animaux', 'Chats'], likes: 209, image: coloring04, imagePath: coloring04 },
];

const nav = ['Accueil', 'Catégories', 'Favoris', 'Nouveautés', 'Infos', 'Profil'];
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
  const cats = ['Tous', 'Fées', 'Halloween', 'Fille', 'Garçon', 'Véhicules', 'Dinosaures', 'Animaux', 'Chats', 'Noël'];

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
    setFavs(current => {
      const next = new Set(current);
      wasFavorite ? next.delete(id) : next.add(id);
      return next;
    });
    setDrawings(current => current.map(d => d.id === id ? { ...d, likes: Math.max(0, d.likes + (wasFavorite ? -1 : 1)) } : d));
    setOpen(current => current?.id === id ? { ...current, likes: Math.max(0, current.likes + (wasFavorite ? -1 : 1)) } : current);

    if (!session?.user) return;

    const query = wasFavorite
      ? supabase.from('favorites').delete().eq('user_id', session.user.id).eq('coloring_id', id)
      : supabase.from('favorites').insert({ user_id: session.user.id, coloring_id: id });

    const { error } = await query;
    if (error) {
      await loadAccount(session);
      await loadDrawings();
      alert('Impossible de synchroniser ce favori pour le moment.');
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
      <div className="cb-floral"><img src={floralTop} alt="" /></div>

      <header className="cb-header">
        <img className="nav-art" src={navigationSearch} alt="" />
        <div className="logo" aria-label="ColorBloom"><img src={colorBloomLogo} alt="ColorBloom" /></div>

        <nav>
          {nav.map(x => (
            <button className={page === x && !ownerOpen ? 'nav-active' : ''} onClick={() => { setPage(x); setOwnerOpen(false); }} key={x}>
              {x}
            </button>
          ))}
        </nav>

        <div className="search">
          <Search />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher..." />
          <button className="settings-btn" style={{backgroundImage:`url(${settingsArt})`}} onClick={() => setSettings(!settings)}><Settings /></button>
        </div>

        {settings && (
          <div className="settings">
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
          <p>Choisis un coloriage, ouvre-le en grand puis télécharge-le en PNG ou PDF A4.</p>
          <p>Avec un compte, tes favoris et ton profil sont synchronisés entre tes appareils.</p>
        </section>
      ) : (
        <section className="layout cb-home">
          <aside className="wood-menu" style={{backgroundImage:`url(${categoryPanel})`}}>
            <h3>Trier par</h3>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="recent">Ajoutés récemment</option>
              <option value="liked">Les plus aimés</option>
            </select>
            <h3>Catégories</h3>
            <div className="cats">
              {cats.map(catName => (
                <button
                  className={cat === catName ? 'active' : ''}
                  onClick={() => { setCat(catName); setPage('Accueil'); }}
                  key={catName}
                >
                  {catName}
                </button>
              ))}
            </div>
          </aside>

          <section className="content">
            {shown.length ? (
              <div className="grid">
                {shown.map((d, i) => (
                  <article className={'frame frame-' + ((i % 8) + 1)} key={d.id} onClick={() => setOpen(d)}>
                    <div className="paper"><img className="coloring-img" src={d.image} alt={d.title} /></div>
                    <button style={{backgroundImage:`url(${heartArt})`}} className={'heart ' + (favs.has(d.id) ? 'liked' : '')} onClick={e => { e.stopPropagation(); heart(d.id); }} aria-label="Favori">
                      <Heart fill={favs.has(d.id) ? 'currentColor' : 'none'} />
                      <span>{d.likes}</span>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty"><Heart /><h2>Ce jardin est encore vide</h2></div>
            )}
          </section>

          <aside className="ad">
            <span>PUBLICITÉ</span>
            <div className="book">POM<br /><b>et le papillon</b><i>Une douce aventure</i></div>
          </aside>
        </section>
      )}

      <footer>ColorBloom • Des coloriages pour laisser fleurir l'imagination</footer>

      {open && (
        <div className="modal" onClick={() => setOpen(null)}>
          <div className="modalbox" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(null)}><X /></button>
            <div className="bigpaper"><img className="coloring-img big" src={open.image} alt={open.title} /></div>
            <h2>{open.title}</h2>
            <p>{open.cat.join(' • ')}</p>
            <div className="actions">
              <button onClick={() => heart(open.id)}><Heart fill={favs.has(open.id) ? 'currentColor' : 'none'} /> {open.likes}</button>
              <button onClick={() => download('PNG')}><Download /> {downloading === 'PNG' ? 'Préparation…' : 'PNG'}</button>
              <button onClick={() => download('PDF')}><Download /> {downloading === 'PDF' ? 'Préparation…' : 'PDF A4'}</button>
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
