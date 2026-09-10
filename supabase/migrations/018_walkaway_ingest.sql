-- Walk-away generate: persist OCR/title progress, keep failed notebooks,
-- and attach class copies so exam homework can land on the teacher board.

alter table public.decks
  add column if not exists ingest_progress jsonb;

alter table public.decks
  add column if not exists class_link_id uuid references public.class_links(id) on delete set null;

create index if not exists decks_class_link_idx
  on public.decks (class_link_id)
  where class_link_id is not null;

alter table public.exam_attempts
  add column if not exists class_link_id uuid references public.class_links(id) on delete set null;

create index if not exists exam_attempts_class_link_idx
  on public.exam_attempts (class_link_id, created_at desc)
  where class_link_id is not null;
