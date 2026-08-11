-- Better Auth (email/password + passkeys) + admin role fields + unlimited energy
-- Community/share extras for E4–E7

-- Core Better Auth tables (camelCase columns match Better Auth defaults)
create table if not exists public."user" (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  role text default 'user',
  banned boolean default false,
  "banReason" text,
  "banExpires" timestamptz
);

create table if not exists public.session (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references public."user"(id) on delete cascade,
  "impersonatedBy" text
);

create index if not exists session_userId_idx on public.session ("userId");

create table if not exists public.account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references public."user"(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists account_userId_idx on public.account ("userId");

create table if not exists public.verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists public.passkey (
  id text primary key,
  name text,
  "publicKey" text not null,
  "userId" text not null references public."user"(id) on delete cascade,
  "credentialID" text not null,
  counter integer not null,
  "deviceType" text not null,
  "backedUp" boolean not null,
  transports text,
  "createdAt" timestamptz,
  aaguid text
);

create index if not exists passkey_userId_idx on public.passkey ("userId");
create unique index if not exists passkey_credentialID_uidx on public.passkey ("credentialID");

alter table public."user" enable row level security;
alter table public.session enable row level security;
alter table public.account enable row level security;
alter table public.verification enable row level security;
alter table public.passkey enable row level security;
revoke all on table public."user", public.session, public.account, public.verification, public.passkey
  from anon, authenticated;

-- Unlimited energy flag
alter table public.user_credits
  add column if not exists is_unlimited boolean not null default false;

-- URL / import sources
alter table public.decks drop constraint if exists decks_source_type_check;
alter table public.decks
  add constraint decks_source_type_check
  check (source_type in ('text', 'file', 'photo', 'url'));

-- Community social + moderation + class mode + featured
alter table public.decks
  add column if not exists is_featured boolean not null default false,
  add column if not exists like_count integer not null default 0,
  add column if not exists class_join_count integer not null default 0;

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  reporter_user_id text not null,
  reason text not null,
  details text,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  appeal_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

create index if not exists moderation_reports_status_idx
  on public.moderation_reports (status, created_at desc);

create table if not exists public.deck_likes (
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (deck_id, user_id)
);

create table if not exists public.deck_comments (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id text not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists deck_comments_deck_idx
  on public.deck_comments (deck_id, created_at desc);

create table if not exists public.class_links (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  teacher_user_id text not null,
  token_hash text not null unique,
  join_count integer not null default 0,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists class_links_deck_idx on public.class_links (deck_id);

alter table public.moderation_reports enable row level security;
alter table public.deck_likes enable row level security;
alter table public.deck_comments enable row level security;
alter table public.class_links enable row level security;
revoke all on table
  public.moderation_reports,
  public.deck_likes,
  public.deck_comments,
  public.class_links
from anon, authenticated;
