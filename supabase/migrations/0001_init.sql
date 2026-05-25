-- VidPost initial schema
-- Run in Supabase SQL editor, or via `supabase db push` if using the Supabase CLI.

-- =========================================
-- connected_accounts: one row per platform per user
-- =========================================
create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('tiktok','instagram','youtube','linkedin','pinterest')),
  platform_user_id text not null,
  platform_username text,
  platform_avatar text,
  -- tokens are stored as ciphertext (AES-256-GCM, see lib/encrypt.ts)
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

create index if not exists connected_accounts_user_id_idx
  on public.connected_accounts (user_id);

create index if not exists connected_accounts_expires_idx
  on public.connected_accounts (token_expires_at)
  where token_expires_at is not null;

-- =========================================
-- posts
-- =========================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  caption text,
  media_url text,
  media_type text check (media_type in ('video','image')),
  platforms text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','published','failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_scheduled_at_idx on public.posts (scheduled_at)
  where scheduled_at is not null;

-- =========================================
-- post_results: one row per (post, platform) attempt
-- =========================================
create table if not exists public.post_results (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null,
  status text not null check (status in ('success','failed','pending')),
  platform_post_id text,
  platform_post_url text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists post_results_post_id_idx on public.post_results (post_id);

-- =========================================
-- updated_at trigger
-- =========================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists connected_accounts_set_updated_at on public.connected_accounts;
create trigger connected_accounts_set_updated_at
  before update on public.connected_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- =========================================
-- RLS
-- =========================================
alter table public.connected_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.post_results enable row level security;

-- connected_accounts: user owns their rows; service role bypasses RLS automatically.
drop policy if exists "ca_select_own" on public.connected_accounts;
create policy "ca_select_own" on public.connected_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "ca_insert_own" on public.connected_accounts;
create policy "ca_insert_own" on public.connected_accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "ca_update_own" on public.connected_accounts;
create policy "ca_update_own" on public.connected_accounts
  for update using (auth.uid() = user_id);

drop policy if exists "ca_delete_own" on public.connected_accounts;
create policy "ca_delete_own" on public.connected_accounts
  for delete using (auth.uid() = user_id);

-- posts
drop policy if exists "posts_select_own" on public.posts;
create policy "posts_select_own" on public.posts
  for select using (auth.uid() = user_id);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update using (auth.uid() = user_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = user_id);

-- post_results: visible/insertable iff the parent post belongs to the user
drop policy if exists "pr_select_own" on public.post_results;
create policy "pr_select_own" on public.post_results
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_results.post_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "pr_insert_own" on public.post_results;
create policy "pr_insert_own" on public.post_results
  for insert with check (
    exists (
      select 1 from public.posts p
      where p.id = post_results.post_id and p.user_id = auth.uid()
    )
  );
