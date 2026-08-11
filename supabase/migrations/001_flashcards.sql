-- Flashcard Generator app schema (Better Auth user ids are text)
-- Run via: npm run db:migrate

create extension if not exists "pgcrypto";

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('text', 'file', 'photo')),
  source_content text,
  source_media_url text,
  share_token text unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  front text not null,
  back text not null,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists card_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  rating text not null check (rating in ('easy', 'ok', 'hard')),
  reviewed_at timestamptz not null default now(),
  unique (card_id, user_id)
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  card_order uuid[] not null default '{}',
  current_index integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists decks_user_id_idx on decks(user_id);
create index if not exists cards_deck_id_idx on cards(deck_id);
create index if not exists card_reviews_user_id_idx on card_reviews(user_id);
create index if not exists study_sessions_deck_user_idx on study_sessions(deck_id, user_id);

-- Supabase Storage bucket (run in SQL Editor if migration lacks storage permissions)
-- insert into storage.buckets (id, name, public) values ('flashcard-media', 'flashcard-media', false);
