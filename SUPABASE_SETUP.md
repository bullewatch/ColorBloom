# ColorBloom — activation Supabase

Le code de cette branche est déjà relié au projet Supabase ColorBloom avec la clé publique (publishable key).

## 1. Initialiser la base

Dans Supabase :

1. Ouvrir **SQL Editor**.
2. Créer une nouvelle requête.
3. Copier tout le contenu de `supabase/schema.sql`.
4. Exécuter la requête.

Le script crée :

- `profiles` pour les profils utilisateurs ;
- `coloring_pages` pour le catalogue de coloriages ;
- `favorites` pour les favoris / likes synchronisés ;
- `coloring_requests` pour les demandes de nouveaux coloriages ;
- le bucket Storage public `colorings` ;
- les règles RLS ;
- les 4 coloriages déjà présents dans le site.

## 2. Configurer l’authentification

Dans **Authentication > URL Configuration** :

- **Site URL** : `https://color-bloom-one.vercel.app`
- ajouter `https://color-bloom-one.vercel.app/**` dans les URLs de redirection autorisées.

## 3. Créer le compte propriétaire

Une fois le site déployé avec cette branche :

1. ouvrir **Profil** ;
2. créer le compte qui servira de compte propriétaire ;
3. confirmer l’e-mail si Supabase le demande ;
4. revenir dans **SQL Editor** et exécuter :

```sql
update public.profiles
set is_admin = true
where id = (
  select id from auth.users
  where email = 'TON_EMAIL_PROPRIETAIRE'
);
```

Déconnecte-toi puis reconnecte-toi. Le bouton **Espace propriétaire** devient alors disponible.

## 4. Ce qui change

- Les coloriages ajoutés depuis l’admin sont envoyés dans Supabase Storage.
- Leur nom, catégories et métadonnées sont enregistrés dans Postgres.
- Ils sont visibles depuis tous les appareils et navigateurs.
- Les favoris sont synchronisés pour les utilisateurs connectés.
- L’espace propriétaire n’est plus activable simplement depuis le navigateur : il dépend du rôle admin stocké côté base.
- Les visiteurs conservent temporairement leurs favoris dans le navigateur tant qu’ils ne créent pas de compte.

La `service_role key`, le mot de passe Postgres et les secrets JWT ne doivent jamais être ajoutés au dépôt ou au code navigateur.
