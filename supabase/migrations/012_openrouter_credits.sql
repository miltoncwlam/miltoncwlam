-- OpenRouter replaces direct openai/anthropic/google providers.
-- Scale weekly energy grant 100 → 600 (×6) for existing users.

alter table decks drop constraint if exists decks_generation_provider_check;

alter table decks
  add constraint decks_generation_provider_check
  check (
    generation_provider is null
    or generation_provider in ('openrouter', 'ollama', 'openai', 'anthropic', 'google')
  );

update decks
set generation_provider = 'openrouter',
    generation_model = coalesce(nullif(generation_model, ''), 'openai/gpt-5.6-luna')
where generation_provider in ('openai', 'anthropic', 'google');

update user_credits
set period_grant = 600,
    balance = case
      when is_unlimited then balance
      else least(balance * 6, 600)
    end,
    updated_at = now()
where period_grant = 100 or balance <= 100;
