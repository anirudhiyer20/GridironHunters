alter table public.user_characters
  add column if not exists shirt_color text not null default '#496a43',
  add column if not exists pants_color text not null default '#3b3c45';

alter table public.user_characters
  drop constraint if exists user_characters_clothing_hex_colors;

alter table public.user_characters
  add constraint user_characters_clothing_hex_colors check (
    shirt_color ~ '^#[0-9A-Fa-f]{6}$'
    and pants_color ~ '^#[0-9A-Fa-f]{6}$'
  );
