-- VidPost API keys: machine-to-machine access so other apps (e.g. the Amazon
-- affiliate engine) can publish on a user's behalf. Only the SHA-256 hash of the
-- key is stored; the raw key is shown once at creation.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  key_hash text not null unique,
  key_prefix text not null,             -- e.g. "vp_ab12cd" for display
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);
create index if not exists api_keys_hash_idx on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

-- Owners can see/manage their own keys (the v1 API + creation use the
-- service-role client, which bypasses RLS).
drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own" on public.api_keys
  for select using (auth.uid() = user_id);

drop policy if exists "api_keys_delete_own" on public.api_keys;
create policy "api_keys_delete_own" on public.api_keys
  for delete using (auth.uid() = user_id);
