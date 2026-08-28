-- Notebook studio: mind map, study notes, and exam papers on a deck source.

create table if not exists public.deck_artifacts (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  kind text not null check (kind in ('mindmap', 'notes', 'exam')),
  payload jsonb not null default '{}'::jsonb,
  generation_status text not null default 'complete'
    check (generation_status in ('pending', 'processing', 'complete', 'failed')),
  generation_model text,
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deck_id, kind)
);

create index if not exists deck_artifacts_deck_id_idx
  on public.deck_artifacts (deck_id);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id text not null,
  answers jsonb not null default '{}'::jsonb,
  result jsonb,
  score integer not null default 0 check (score >= 0),
  max_score integer not null default 0 check (max_score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists exam_attempts_deck_user_idx
  on public.exam_attempts (deck_id, user_id, created_at desc);

alter table public.deck_artifacts enable row level security;
alter table public.exam_attempts enable row level security;
revoke all on table public.deck_artifacts from anon, authenticated;
revoke all on table public.exam_attempts from anon, authenticated;
