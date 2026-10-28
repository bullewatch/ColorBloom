-- ColorBloom / Supabase initial schema
-- Run this file once in Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_index integer not null default 0 check (avatar_index between 0 and 7),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coloring_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) between 1 and 160),
  categories text[] not null default '{}',
  image_path text not null,
  likes_count integer not null default 0 check (likes_count >= 0),
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  coloring_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, coloring_id)
);

create table if not exists public.coloring_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  description text not null check (char_length(description) between 3 and 2000),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','done')),
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists coloring_pages_touch_updated_at on public.coloring_pages;
create trigger coloring_pages_touch_updated_at
before update on public.coloring_pages
for each row execute procedure public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

create or replace function public.favorite_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coloring_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    update public.coloring_pages
    set likes_count = likes_count + 1
    where id = new.coloring_id::uuid;
  end if;
  return new;
end;
$$;

create or replace function public.favorite_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.coloring_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    update public.coloring_pages
    set likes_count = greatest(likes_count - 1, 0)
    where id = old.coloring_id::uuid;
  end if;
  return old;
end;
$$;

drop trigger if exists favorites_increment_count on public.favorites;
create trigger favorites_increment_count
after insert on public.favorites
for each row execute procedure public.favorite_added();

drop trigger if exists favorites_decrement_count on public.favorites;
create trigger favorites_decrement_count
after delete on public.favorites
for each row execute procedure public.favorite_removed();

alter table public.profiles enable row level security;
alter table public.coloring_pages enable row level security;
alter table public.favorites enable row level security;
alter table public.coloring_requests enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_user_is_admin());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "published colorings are public" on public.coloring_pages;
create policy "published colorings are public"
on public.coloring_pages for select
to anon, authenticated
using (is_published = true or public.current_user_is_admin());

drop policy if exists "admins insert colorings" on public.coloring_pages;
create policy "admins insert colorings"
on public.coloring_pages for insert
to authenticated
with check (public.current_user_is_admin());

drop policy if exists "admins update colorings" on public.coloring_pages;
create policy "admins update colorings"
on public.coloring_pages for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "admins delete colorings" on public.coloring_pages;
create policy "admins delete colorings"
on public.coloring_pages for delete
to authenticated
using (public.current_user_is_admin());

drop policy if exists "users read own favorites" on public.favorites;
create policy "users read own favorites"
on public.favorites for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users add own favorites" on public.favorites;
create policy "users add own favorites"
on public.favorites for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users remove own favorites" on public.favorites;
create policy "users remove own favorites"
on public.favorites for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "visitors submit requests" on public.coloring_requests;
create policy "visitors submit requests"
on public.coloring_requests for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

drop policy if exists "admins read requests" on public.coloring_requests;
create policy "admins read requests"
on public.coloring_requests for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "admins update requests" on public.coloring_requests;
create policy "admins update requests"
on public.coloring_requests for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "admins delete requests" on public.coloring_requests;
create policy "admins delete requests"
on public.coloring_requests for delete
to authenticated
using (public.current_user_is_admin());

revoke all on public.profiles from anon, authenticated;
revoke all on public.coloring_pages from anon, authenticated;
revoke all on public.favorites from anon, authenticated;
revoke all on public.coloring_requests from anon, authenticated;

grant select on public.coloring_pages to anon, authenticated;
grant insert, update, delete on public.coloring_pages to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_index) on public.profiles to authenticated;

grant select, insert, delete on public.favorites to authenticated;

grant insert on public.coloring_requests to anon, authenticated;
grant select, update, delete on public.coloring_requests to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'colorings',
  'colorings',
  true,
  10485760,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read coloring files" on storage.objects;
create policy "public read coloring files"
on storage.objects for select
to public
using (bucket_id = 'colorings');

drop policy if exists "admins upload coloring files" on storage.objects;
create policy "admins upload coloring files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'colorings' and public.current_user_is_admin());

drop policy if exists "admins update coloring files" on storage.objects;
create policy "admins update coloring files"
on storage.objects for update
to authenticated
using (bucket_id = 'colorings' and public.current_user_is_admin())
with check (bucket_id = 'colorings' and public.current_user_is_admin());

drop policy if exists "admins delete coloring files" on storage.objects;
create policy "admins delete coloring files"
on storage.objects for delete
to authenticated
using (bucket_id = 'colorings' and public.current_user_is_admin());

insert into public.coloring_pages (slug, title, categories, image_path, likes_count, is_published)
values
  ('portrait-au-ruban', 'Portrait au ruban', array['Fille'], '/coloring-01.jpg', 184, true),
  ('jeune-fille-aux-grands-yeux', 'Jeune fille aux grands yeux', array['Fille'], '/coloring-02.jpg', 263, true),
  ('jeune-fille-souriante', 'Jeune fille souriante', array['Fille'], '/coloring-03.jpg', 151, true),
  ('petit-chat-au-chapeau', 'Petit chat au chapeau', array['Animaux','Chats'], '/coloring-04.jpg', 209, true)
on conflict (slug) do update
set title = excluded.title,
    categories = excluded.categories,
    image_path = excluded.image_path,
    is_published = excluded.is_published;

-- After you create your own ColorBloom account in the site, promote it once:
-- update public.profiles
-- set is_admin = true
-- where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com');

-- === COLORBLOP STRIPE BILLING & SUBSCRIPTIONS SCHEMA ===
create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
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

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  license_number text unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id text references public.subscriptions(id) on delete cascade,
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

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_plan text,
  add column if not exists subscription_status text default 'inactive',
  add column if not exists subscription_period_end timestamptz;

alter table public.subscriptions enable row level security;
alter table public.licenses enable row level security;
alter table public.stripe_events enable row level security;

create policy "users read own subscriptions"
on public.subscriptions for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

create policy "users read own licenses"
on public.licenses for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

grant select on public.subscriptions to authenticated;
grant select on public.licenses to authenticated;

-- === COLORBLOP SANDBOX ISOLATION SCHEMA (MISSION 4) ===
-- Ces tables isolées permettent d'exécuter des tests Stripe Sandbox
-- sans jamais modifier ni écraser les abonnements, licences ou profils des utilisateurs réels.
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

create table if not exists public.sandbox_stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.sandbox_subscriptions enable row level security;
alter table public.sandbox_licenses enable row level security;
alter table public.sandbox_stripe_events enable row level security;

create policy "users read own sandbox subscriptions"
on public.sandbox_subscriptions for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

create policy "users read own sandbox licenses"
on public.sandbox_licenses for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

grant select on public.sandbox_subscriptions to authenticated;
grant select on public.sandbox_licenses to authenticated;

