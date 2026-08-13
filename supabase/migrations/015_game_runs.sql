-- Classroom activity runs. Owned play stakes energy in payload (stake/payout); share/embed stay free.

create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id text not null,
  template text not null,
  score integer not null default 0,
  max_score integer not null default 0,
  payload jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists game_runs_user_deck_idx
  on public.game_runs (user_id, deck_id, completed_at desc);

alter table public.game_runs enable row level security;
revoke all on table public.game_runs from anon, authenticated;
