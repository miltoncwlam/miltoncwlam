-- Persist notebook chat. Chat always uses DeepSeek 0731, not Auto / Qwen / V4.1.

create table if not exists public.notebook_chat_messages (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists notebook_chat_deck_user_idx
  on public.notebook_chat_messages (deck_id, user_id, created_at);

alter table public.notebook_chat_messages enable row level security;
revoke all on table public.notebook_chat_messages from anon, authenticated;
