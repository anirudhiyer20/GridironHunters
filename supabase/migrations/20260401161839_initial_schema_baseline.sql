-- Initial baseline migration.
-- Keep this first migration intentionally small so future schema decisions
-- are added deliberately in follow-up migrations.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
