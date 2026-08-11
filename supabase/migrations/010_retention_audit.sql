-- F2 source retention + F3 audit log

alter table public.decks
  add column if not exists source_retention text not null default '24h'
    check (source_retention in ('none', '24h', 'keep')),
  add column if not exists source_expires_at timestamptz;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_user_idx
  on public.audit_log (user_id, created_at desc);

create index if not exists audit_log_action_idx
  on public.audit_log (action, created_at desc);

alter table public.audit_log enable row level security;
revoke all on table public.audit_log from anon, authenticated;
