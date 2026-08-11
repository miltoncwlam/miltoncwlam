-- Security harden + credits + quizzes
-- App data access is via server DATABASE_URL only (not PostgREST anon).

-- Fix mutable search_path on trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Drop leftover Better Auth tables (Clerk is auth now)
drop table if exists public.passkey cascade;
drop table if exists public.session cascade;
drop table if exists public.account cascade;
drop table if exists public.verification cascade;
drop table if exists public."user" cascade;

-- Lock migration bookkeeping from API roles
alter table if exists public.app_migrations enable row level security;
revoke all on table public.app_migrations from anon, authenticated;

-- Ensure app tables stay locked from PostgREST roles
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.card_reviews enable row level security;
alter table public.study_sessions enable row level security;
revoke all on table public.decks, public.cards, public.card_reviews, public.study_sessions
  from anon, authenticated;

-- Credits (time-cycle refill; payment hooks later — no billing UI)
create table if not exists public.user_credits (
  user_id text primary key,
  balance integer not null default 100 check (balance >= 0),
  period_start timestamptz not null default date_trunc('week', now()),
  period_end timestamptz not null default (date_trunc('week', now()) + interval '7 days'),
  period_grant integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.user_credits(user_id) on delete cascade,
  delta integer not null,
  reason text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger(user_id, created_at desc);

alter table public.user_credits enable row level security;
alter table public.credit_ledger enable row level security;
revoke all on table public.user_credits, public.credit_ledger from anon, authenticated;

drop trigger if exists user_credits_set_updated_at on public.user_credits;
create trigger user_credits_set_updated_at
before update on public.user_credits
for each row execute function public.set_updated_at();

-- Quiz sessions (gamified multiple-choice runs)
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id text not null,
  question_order uuid[] not null default '{}',
  current_index integer not null default 0,
  score integer not null default 0,
  total integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  selected_option text,
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  unique (quiz_session_id, card_id)
);

create index if not exists quiz_sessions_user_deck_idx
  on public.quiz_sessions(user_id, deck_id);

alter table public.quiz_sessions enable row level security;
alter table public.quiz_answers enable row level security;
revoke all on table public.quiz_sessions, public.quiz_answers from anon, authenticated;

drop trigger if exists quiz_sessions_set_updated_at on public.quiz_sessions;
create trigger quiz_sessions_set_updated_at
before update on public.quiz_sessions
for each row execute function public.set_updated_at();

-- Privacy: wipe retained source blobs on non-seed decks
update public.decks
set source_content = null,
    storage_path = null,
    source_filename = null,
    source_mime_type = null,
    source_size_bytes = null
where coalesce(is_seed, false) = false;

-- Reset test user data (keep curated community seed packs)
delete from public.quiz_answers;
delete from public.quiz_sessions;
delete from public.card_reviews;
delete from public.study_sessions;
delete from public.cards c
using public.decks d
where c.deck_id = d.id and coalesce(d.is_seed, false) = false;
delete from public.decks where coalesce(is_seed, false) = false;
delete from public.credit_ledger;
delete from public.user_credits;

-- Storage: private bucket + deny public roles (uploads go through service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flashcard-media',
  'flashcard-media',
  false,
  10485760,
  array[
    'text/plain',
    'text/markdown',
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Drop any overly permissive storage policies on our bucket
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        qual::text ilike '%flashcard-media%'
        or with_check::text ilike '%flashcard-media%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;
