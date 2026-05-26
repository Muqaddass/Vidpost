-- Add 'facebook' to the connected_accounts.platform check constraint.
-- Postgres has no "alter check constraint" — drop and recreate.

alter table public.connected_accounts
  drop constraint if exists connected_accounts_platform_check;

alter table public.connected_accounts
  add constraint connected_accounts_platform_check
  check (platform in ('tiktok','instagram','youtube','linkedin','pinterest','facebook'));
