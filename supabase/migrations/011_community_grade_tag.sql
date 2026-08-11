-- HK community filters: grade band on public decks
alter table public.decks
  add column if not exists grade_tag text;

create index if not exists decks_grade_tag_idx
  on public.decks (grade_tag)
  where grade_tag is not null;

create index if not exists decks_community_filters_idx
  on public.decks (visibility, moderation_status, subject_tag, grade_tag)
  where visibility = 'public' and moderation_status = 'approved';
