-- Daily study streak (Hong Kong calendar). App access is via server DATABASE_URL.

create table if not exists public.user_streaks (
  user_id text primary key,
  current_count integer not null default 0 check (current_count >= 0),
  longest_count integer not null default 0 check (longest_count >= 0),
  last_hk_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;
revoke all on table public.user_streaks from anon, authenticated;
