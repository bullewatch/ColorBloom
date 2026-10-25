# Colorblop — Configuration Supabase

Le code est relié au projet Supabase Colorblop via la clé publique (`publishable key`).

---

## 1. Mettre à jour l'URL du site et les redirections (Essentiel !)

Pour que les e-mails de confirmation renvoient vers la bonne adresse (et non plus vers l'ancienne URL `color-bloom-one.vercel.app`) :

1. Dans le tableau de bord Supabase, va dans **Authentication** > **URL Configuration**.
2. **Site URL** : Remplacer par l'URL actuelle de ton site (ex: `https://colorblop.com` ou ta nouvelle URL Vercel `https://[ton-projet].vercel.app`).
3. **Redirect URLs** : Ajouter les URLs de redirection autorisées :
   - `http://localhost:5173/**` (pour les tests en local)
   - `https://color-bloom-one.vercel.app/**` (ancienne URL de secours)
   - `https://[ton-projet].vercel.app/**` (ton URL Vercel)
   - `https://colorblop.com/**` (ton domaine personnalisé, si tu en as un)
4. Cliquer sur **Save**.

---

## 2. Personnaliser le modèle d'e-mail de confirmation (Multilingue & Joli)

Un modèle soigné reprenant l'univers boisé de Colorblop et s'adaptant automatiquement à la langue choisie par l'utilisateur (FR, EN, ES, DE) est disponible dans le fichier `supabase/templates/confirmation.html`.

1. Dans Supabase, va dans **Authentication** > **Email Templates**.
2. Clique sur l'onglet **Confirm signup**.
3. **Subject** :
   ```text
   Bienvenue sur Colorblop ! Confirmez votre adresse e-mail 🌸
   ```
4. **Body** : Copie-colle l'intégralité du contenu de [`supabase/templates/confirmation.html`](./supabase/templates/confirmation.html).
5. Clique sur **Save**.

Désormais, le mail s'affiche avec la signature « Cordialement, Mme Colorblop 🌸 », un joli bouton en bois et s'adapte à la langue (Français par défaut, Anglais, Espagnol, Allemand).

---

## 3. Configurer l'expéditeur (noreply@colorblop.com)

Par défaut, Supabase envoie les e-mails depuis `Supabase Auth <noreply@mail.app.supabase.io>` avec une limite de sécurité de 3 e-mails par heure.

Pour envoyer depuis une adresse personnalisée telle que `noreply@colorblop.com` :

### Option A — Immédiate (Nom d'expéditeur) :
Dans Supabase > **Authentication** > **Email Templates** :
- **Sender Name** : `Colorblop`
- (Dans la boîte de réception des utilisateurs, le nom affiché sera alors directement **Colorblop** au lieu de "Supabase Auth").

### Option B — Adresse e-mail personnalisée (`noreply@colorblop.com`) :
Il faut activer un service SMTP (recommandé : **Resend** ou **Brevo**, gratuits jusqu'à 3 000 e-mails/mois) :
1. Crée un compte gratuit sur [Resend.com](https://resend.com) ou [Brevo.com](https://brevo.com).
2. Ajoute ton domaine `colorblop.com` et valide les enregistrements DNS (DKIM / SPF) chez ton hébergeur de nom de domaine (OVH, Hostinger, Cloudflare, etc.).
3. Dans Supabase > **Project Settings** > **Authentication** > **SMTP Settings** :
   - Active **Enable Custom SMTP**.
   - **Sender email** : `noreply@colorblop.com`
   - **Sender name** : `Colorblop`
   - **Host** : `smtp.resend.com` (ou celui de Brevo)
   - **Port** : `465` ou `587`
   - **User** : `resend`
   - **Password** : ta clé API Resend.
   - Cliquer sur **Save**.

---

## 4. Compte propriétaire (Admin)

1. Créer un compte sur Colorblop depuis l'onglet **Profil**.
2. Confirmer l'e-mail reçu.
3. Dans **SQL Editor** sur Supabase, exécuter :

```sql
update public.profiles
set is_admin = true
where id = (
  select id from auth.users
  where email = 'flo83119@gmail.com'
);
```

4. Se reconnecter pour voir apparaître l'accès à l'**Espace propriétaire**.
