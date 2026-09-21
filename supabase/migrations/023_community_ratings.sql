-- Community pack ratings (1–5 stars) and copy tracking.

create table if not exists public.deck_ratings (
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id text not null,
  stars integer not null check (stars >= 1 and stars <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (deck_id, user_id)
);

create index if not exists deck_ratings_deck_idx
  on public.deck_ratings (deck_id);

alter table public.deck_ratings enable row level security;
revoke all on table public.deck_ratings from anon, authenticated;

alter table public.decks
  add column if not exists rating_avg real not null default 0,
  add column if not exists rating_count integer not null default 0,
  add column if not exists copy_count integer not null default 0,
  add column if not exists copied_from_deck_id uuid references public.decks(id) on delete set null;

create index if not exists decks_copied_from_idx
  on public.decks (copied_from_deck_id)
  where copied_from_deck_id is not null;
