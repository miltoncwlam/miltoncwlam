create extension if not exists "pgcrypto";

alter table decks
  add column if not exists source_filename text,
  add column if not exists source_mime_type text,
  add column if not exists source_size_bytes bigint,
  add column if not exists storage_path text,
  add column if not exists generation_status text not null default 'complete',
  add column if not exists generation_provider text,
  add column if not exists generation_model text,
  add column if not exists generation_error text,
  add column if not exists is_shared boolean not null default false,
  add column if not exists share_token_hash text;

alter table cards
  add column if not exists hint text,
  add column if not exists category text,
  add column if not exists updated_at timestamptz not null default now();

alter table card_reviews
  add column if not exists study_session_id uuid references study_sessions(id) on delete set null;

alter table study_sessions
  add column if not exists updated_at timestamptz not null default now();

alter table decks drop constraint if exists decks_generation_status_check;
alter table decks
  add constraint decks_generation_status_check
  check (generation_status in ('pending', 'processing', 'complete', 'failed'));

alter table decks drop constraint if exists decks_generation_provider_check;
alter table decks
  add constraint decks_generation_provider_check
  check (
    generation_provider is null
    or generation_provider in ('openai', 'anthropic', 'google')
  );

alter table card_reviews
  drop constraint if exists card_reviews_card_id_user_id_key;

update decks
set
  share_token_hash = encode(digest(share_token, 'sha256'), 'hex'),
  is_shared = true
where share_token is not null and share_token_hash is null;

alter table decks alter column share_token drop default;
update decks set share_token = null where share_token is not null;

create index if not exists decks_share_token_hash_idx
  on decks(share_token_hash)
  where is_shared = true;
create index if not exists decks_generation_status_idx
  on decks(user_id, generation_status);
create index if not exists card_reviews_card_user_date_idx
  on card_reviews(card_id, user_id, reviewed_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists decks_set_updated_at on decks;
create trigger decks_set_updated_at
before update on decks
for each row execute function set_updated_at();

drop trigger if exists cards_set_updated_at on cards;
create trigger cards_set_updated_at
before update on cards
for each row execute function set_updated_at();

drop trigger if exists study_sessions_set_updated_at on study_sessions;
create trigger study_sessions_set_updated_at
before update on study_sessions
for each row execute function set_updated_at();

alter table decks enable row level security;
alter table cards enable row level security;
alter table card_reviews enable row level security;
alter table study_sessions enable row level security;

revoke all on decks, cards, card_reviews, study_sessions from anon, authenticated;
