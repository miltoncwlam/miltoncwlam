-- Card types + community visibility

alter table cards
  add column if not exists card_type text not null default 'qa',
  add column if not exists options jsonb;

alter table cards drop constraint if exists cards_card_type_check;
alter table cards
  add constraint cards_card_type_check
  check (card_type in ('qa', 'definition', 'cloze', 'mcq'));

alter table decks
  add column if not exists visibility text not null default 'private',
  add column if not exists subject_tag text,
  add column if not exists moderation_status text not null default 'none',
  add column if not exists moderation_reasons text,
  add column if not exists listed_at timestamptz,
  add column if not exists is_seed boolean not null default false;

-- Migrate legacy share flag → unlisted
update decks
set visibility = 'unlisted'
where is_shared = true and visibility = 'private';

alter table decks drop constraint if exists decks_visibility_check;
alter table decks
  add constraint decks_visibility_check
  check (visibility in ('private', 'unlisted', 'public'));

alter table decks drop constraint if exists decks_moderation_status_check;
alter table decks
  add constraint decks_moderation_status_check
  check (moderation_status in ('none', 'pending', 'approved', 'rejected'));

create index if not exists decks_community_public_idx
  on decks (listed_at desc nulls last)
  where visibility = 'public' and moderation_status = 'approved';

create index if not exists decks_subject_tag_idx
  on decks (subject_tag)
  where subject_tag is not null;
