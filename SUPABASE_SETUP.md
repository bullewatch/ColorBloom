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

## 2. Modèle d'e-mail de confirmation (Format original sans emojis)

Le modèle original reprenant la carte et les tons Colorblop, débarrassé de tout emoji, est disponible dans le fichier `supabase/templates/confirmation.html`.

1. Dans Supabase, va dans **Authentication** > **Email Templates**.
2. Clique sur l'onglet **Confirm signup**.
3. **Subject** :
   ```text
   Bienvenue sur Colorblop ! Confirmez votre adresse e-mail
   ```
4. **Body** : Copie-colle l'intégralité du contenu de [`supabase/templates/confirmation.html`](./supabase/templates/confirmation.html).
5. Clique sur **Save**.

### E-mail de réinitialisation de mot de passe (Reset password)
1. Clique sur l'onglet **Reset password**.
2. **Subject** :
   ```text
   Réinitialisation de votre mot de passe Colorblop
   ```
3. **Body** : Copie-colle l'intégralité du contenu de [`supabase/templates/reset_password.html`](./supabase/templates/reset_password.html).
4. Clique sur **Save**.

---

## 3. Activer la connexion Google (Google OAuth)

La connexion Google permet aux utilisateurs de créer un compte et de se connecter en un clic sans mot de passe.
Tout le code et la base de données Colorblop sont déjà prêts (création automatique du profil avec le nom Google, nettoyage propre de l'URL, gestion de l'avatar).

Il suffit de relier Google et Supabase :

### Étape 1 : Obtenir les identifiants sur Google Cloud Console (2 minutes)
1. Rends-toi sur la [Console Google Cloud](https://console.cloud.google.com/).
2. Crée ou sélectionne un projet (ex: `Colorblop`).
3. Dans le menu de gauche, va dans **API et services** > **Écran de consentement OAuth** :
   - Type d'utilisateur : **Externe**.
   - Nom de l'application : `Colorblop`.
   - Adresse e-mail d'assistance utilisateur : ton adresse (ex: `contact@colorblop.com`).
   - Coordonnées du développeur : ton adresse.
   - Enregistre et passe les étapes suivantes (les champs par défaut `email`, `profile`, `openid` suffisent).
4. Va ensuite dans **API et services** > **Identifiants** :
   - Clique sur **+ Créer des identifiants** > **ID client OAuth**.
   - Type d'application : **Application Web**.
   - Nom : `Colorblop Web`.
   - Dans **Origines JavaScript autorisées**, ajoute :
     - `https://colorblop.com`
     - `http://localhost:5173` (pour tester en local)
   - Dans **URI de redirection autorisés**, ajoute **exactement** :
     - `https://jlyzoxqihqofvsfyqwsw.supabase.co/auth/v1/callback`
   - Clique sur **Créer**.
   - Copie l'**ID client** (se termine par `.apps.googleusercontent.com`) et le **Code secret du client** (Client Secret).

### Étape 2 : Activer Google dans le Dashboard Supabase (30 secondes)
1. Ouvre ton tableau de bord [Supabase Providers](https://supabase.com/dashboard/project/jlyzoxqihqofvsfyqwsw/auth/providers).
2. Dans la liste des fournisseurs, clique sur **Google**.
3. Coche **Enable Google provider**.
4. Colle ton **Client ID** et ton **Client Secret**.
5. Clique sur **Save**.

Dès que c'est fait, le bouton **« Continuer avec Google »** sur Colorblop fonctionne immédiatement en production et en local !

---

## 4. Configurer l'expéditeur (noreply@colorblop.com)

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

## 5. Compte propriétaire (Admin)

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
