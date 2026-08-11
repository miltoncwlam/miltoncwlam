-- C1 spaced repetition state + D1/D2/D6 library fields

create table if not exists public.card_srs (
  user_id text not null,
  card_id uuid not null references public.cards(id) on delete cascade,
  ease_factor double precision not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  last_rating text check (last_rating in ('easy', 'ok', 'hard')),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create index if not exists card_srs_user_due_idx
  on public.card_srs (user_id, due_at);

alter table public.card_srs enable row level security;
revoke all on table public.card_srs from anon, authenticated;

alter table public.decks
  add column if not exists archived_at timestamptz,
  add column if not exists folder_tag text;

create index if not exists decks_user_archived_idx
  on public.decks (user_id, archived_at nulls first, updated_at desc);

create index if not exists decks_user_folder_idx
  on public.decks (user_id, folder_tag)
  where folder_tag is not null;
