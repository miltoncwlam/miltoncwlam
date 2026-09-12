-- Notebook exam lane: HKDSE / IGCSE / A-level. Unknown sources default to HKDSE.

alter table public.decks
  add column if not exists exam_system text not null default 'dse';

alter table public.decks
  drop constraint if exists decks_exam_system_check;

alter table public.decks
  add constraint decks_exam_system_check
  check (exam_system in ('dse', 'igcse', 'a-level'));
