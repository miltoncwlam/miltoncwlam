-- Profiles table stores usernames linked to Supabase Auth users.
-- Run this SQL in the Supabase Dashboard: SQL Editor -> New query -> Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint username_length check (char_length(username) between 3 and 20),
  constraint username_format check (username ~ '^[a-z0-9_]+$')
);

alter table public.profiles enable row level security;

create policy "Profiles are readable for username lookup"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_username text;
begin
  next_username := lower(trim(new.raw_user_meta_data ->> 'username'));

  if next_username is null or next_username = '' then
    raise exception 'Username is required';
  end if;

  insert into public.profiles (id, username)
  values (new.id, next_username);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create index if not exists profiles_username_idx on public.profiles (username);
