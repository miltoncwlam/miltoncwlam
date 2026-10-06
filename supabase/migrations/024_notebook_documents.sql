-- Study notes can stack. Mind map and exam stay one row per notebook.

do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'deck_artifacts'
    and c.contype = 'u'
    and pg_get_constraintdef(c.oid) ilike '%deck_id%'
    and pg_get_constraintdef(c.oid) ilike '%kind%';
  if constraint_name is not null then
    execute format('alter table public.deck_artifacts drop constraint %I', constraint_name);
  end if;
end $$;

create unique index if not exists deck_artifacts_mindmap_exam_uidx
  on public.deck_artifacts (deck_id, kind)
  where kind in ('mindmap', 'exam');
