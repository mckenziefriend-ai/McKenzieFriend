-- Phase 5 setup: chat history, calendar and bundle builder.
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.case_chat_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  action jsonb,
  created_at timestamptz not null default now()
);

alter table public.case_chat_messages enable row level security;

drop policy if exists "Users can read their case chat messages" on public.case_chat_messages;
create policy "Users can read their case chat messages"
  on public.case_chat_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their case chat messages" on public.case_chat_messages;
create policy "Users can insert their case chat messages"
  on public.case_chat_messages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their case chat messages" on public.case_chat_messages;
create policy "Users can delete their case chat messages"
  on public.case_chat_messages
  for delete
  using (auth.uid() = user_id);

create index if not exists case_chat_messages_case_created_idx
  on public.case_chat_messages (case_id, created_at);

create table if not exists public.case_calendar_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  item_type text default 'Other',
  starts_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.case_calendar_items enable row level security;

drop policy if exists "Users can read their calendar items" on public.case_calendar_items;
create policy "Users can read their calendar items"
  on public.case_calendar_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their calendar items" on public.case_calendar_items;
create policy "Users can insert their calendar items"
  on public.case_calendar_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their calendar items" on public.case_calendar_items;
create policy "Users can update their calendar items"
  on public.case_calendar_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their calendar items" on public.case_calendar_items;
create policy "Users can delete their calendar items"
  on public.case_calendar_items
  for delete
  using (auth.uid() = user_id);

create index if not exists case_calendar_items_case_date_idx
  on public.case_calendar_items (case_id, starts_at);

create table if not exists public.case_bundle_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  section text default 'General',
  title text not null,
  item_type text default 'Other',
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.case_bundle_items enable row level security;

drop policy if exists "Users can read their bundle items" on public.case_bundle_items;
create policy "Users can read their bundle items"
  on public.case_bundle_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their bundle items" on public.case_bundle_items;
create policy "Users can insert their bundle items"
  on public.case_bundle_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their bundle items" on public.case_bundle_items;
create policy "Users can update their bundle items"
  on public.case_bundle_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their bundle items" on public.case_bundle_items;
create policy "Users can delete their bundle items"
  on public.case_bundle_items
  for delete
  using (auth.uid() = user_id);

create index if not exists case_bundle_items_case_position_idx
  on public.case_bundle_items (case_id, position);
