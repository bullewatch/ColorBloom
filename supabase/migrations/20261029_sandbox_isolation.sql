-- =============================================================================
-- Migration Colorblop : Création des tables isolées Stripe Sandbox (MISSION 4)
-- =============================================================================
-- Cette migration est STRICTEMENT LIMITÉE AUX TABLES SANDBOX :
-- - Ne touche pas et ne modifie pas les tables de production existantes.
-- - Ne supprime ni ne réinitialise aucune donnée existante.
-- - Crée uniquement les 3 tables isolées sandbox et leurs politiques RLS.
-- =============================================================================

-- 1. Table isolée : sandbox_subscriptions
create table if not exists public.sandbox_subscriptions (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  stripe_customer_id text not null,
  status text not null,
  plan_id text not null,
  price_id text not null,
  interval text not null,
  amount integer not null,
  currency text not null default 'eur',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour accélérer les requêtes utilisateur sur les abonnements sandbox
create index if not exists idx_sandbox_subscriptions_user_id 
  on public.sandbox_subscriptions(user_id);

-- 2. Table isolée : sandbox_licenses
create table if not exists public.sandbox_licenses (
  id uuid primary key default gen_random_uuid(),
  license_number text unique not null,
  user_id uuid references public.profiles(id) on delete cascade,
  subscription_id text references public.sandbox_subscriptions(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  plan_type text not null default 'colorvip_pro',
  interval text not null,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour accélérer les recherches de licences sandbox
create index if not exists idx_sandbox_licenses_user_id 
  on public.sandbox_licenses(user_id);
create index if not exists idx_sandbox_licenses_subscription_id 
  on public.sandbox_licenses(subscription_id);

-- 3. Table isolée : sandbox_stripe_events (avec machine d'état idempotente)
create table if not exists public.sandbox_stripe_events (
  id text primary key,
  type text not null,
  status text not null default 'completed' check (status in ('processing', 'completed', 'failed')),
  claimed_at timestamptz not null default now(),
  processed_at timestamptz default now(),
  error_message text,
  created_at timestamptz not null default now()
);

-- Index pour les événements sandbox
create index if not exists idx_sandbox_stripe_events_status 
  on public.sandbox_stripe_events(status);

-- 4. Sécurité : Activation du Row Level Security (RLS) sur les tables sandbox
alter table public.sandbox_subscriptions enable row level security;
alter table public.sandbox_licenses enable row level security;
alter table public.sandbox_stripe_events enable row level security;

-- 5. Politiques d'accès RLS (Lecture seule pour l'utilisateur propriétaire ou l'administrateur)
drop policy if exists "users read own sandbox subscriptions" on public.sandbox_subscriptions;
create policy "users read own sandbox subscriptions"
  on public.sandbox_subscriptions for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());

drop policy if exists "users read own sandbox licenses" on public.sandbox_licenses;
create policy "users read own sandbox licenses"
  on public.sandbox_licenses for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());

-- La table sandbox_stripe_events n'a aucune politique select publique (réservée au service_role backend)

-- 6. Permissions strictes : révocation des accès publics non sollicités
revoke all on public.sandbox_subscriptions from anon;
revoke all on public.sandbox_licenses from anon;
revoke all on public.sandbox_stripe_events from anon, authenticated;

grant select on public.sandbox_subscriptions to authenticated;
grant select on public.sandbox_licenses to authenticated;

