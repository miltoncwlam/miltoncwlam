-- 錯題本: questions a learner missed on this notebook's papers, with SM-2 scheduling.

create table if not exists public.exam_wrong_items (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id text not null,
  attempt_id uuid references public.exam_attempts(id) on delete set null,
  question_id text not null,
  question jsonb not null,
  your_answer jsonb,
  feedback text not null default '',
  marks integer not null default 0 check (marks >= 0),
  marks_awarded integer not null default 0 check (marks_awarded >= 0),
  ease_factor real not null default 2.5,
  interval_days integer not null default 0 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  due_at timestamptz not null default now(),
  last_rating text check (last_rating in ('hard', 'ok', 'easy')),
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deck_id, user_id, question_id)
);

create index if not exists exam_wrong_items_due_idx
  on public.exam_wrong_items (user_id, deck_id, due_at)
  where cleared_at is null;

alter table public.exam_wrong_items enable row level security;
revoke all on table public.exam_wrong_items from anon, authenticated;
