-- Allow local Ollama as a generation provider (no cloud API key).
alter table decks drop constraint if exists decks_generation_provider_check;
alter table decks
  add constraint decks_generation_provider_check
  check (
    generation_provider is null
    or generation_provider in ('openai', 'anthropic', 'google', 'ollama')
  );
