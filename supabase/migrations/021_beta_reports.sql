-- Beta comments, bug reports, and auto-recorded 4.0.0 beta errors.

create table if not exists public.beta_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('comment', 'bug', 'error')),
  message text not null,
  path text,
  user_id text,
  fingerprint text,
  user_agent text,
  ip_hash text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists beta_reports_created_idx
  on public.beta_reports (created_at desc);

create index if not exists beta_reports_kind_idx
  on public.beta_reports (kind, created_at desc);

create index if not exists beta_reports_fingerprint_idx
  on public.beta_reports (fingerprint, created_at desc);

alter table public.beta_reports enable row level security;
revoke all on table public.beta_reports from anon, authenticated;
