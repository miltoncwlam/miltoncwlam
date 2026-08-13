-- Separate weekly image energy from text energy.
-- Klein (~7 image energy / card) stays playable without draining text energy.

alter table public.user_credits
  add column if not exists image_balance integer not null default 200,
  add column if not exists image_period_grant integer not null default 200;

alter table public.user_credits
  drop constraint if exists user_credits_image_balance_check;
alter table public.user_credits
  add constraint user_credits_image_balance_check check (image_balance >= 0);

alter table public.user_credits
  drop constraint if exists user_credits_image_period_grant_check;
alter table public.user_credits
  add constraint user_credits_image_period_grant_check check (image_period_grant >= 0);

alter table public.credit_ledger
  add column if not exists pool text not null default 'text';

alter table public.credit_ledger
  drop constraint if exists credit_ledger_pool_check;
alter table public.credit_ledger
  add constraint credit_ledger_pool_check check (pool in ('text', 'image'));
