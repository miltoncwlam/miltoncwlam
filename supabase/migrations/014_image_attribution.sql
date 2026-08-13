-- Users no longer get an image-energy grant (no per-user Klein).
-- Store license proof next to card art.

alter table public.user_credits
  alter column image_balance set default 0,
  alter column image_period_grant set default 0;

update public.user_credits
set image_period_grant = 0,
    image_balance = 0,
    updated_at = now()
where coalesce(is_unlimited, false) = false;

alter table public.cards
  add column if not exists image_attribution jsonb;
