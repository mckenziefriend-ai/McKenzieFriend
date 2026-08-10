-- Phase 10 setup: private case notes (the moral support + notetaking feature).
-- Run this in the Supabase SQL editor. Idempotent.
--
-- Notes are freeform, private, per-case jottings — distinct from the formal
-- chronology (which is the case timeline). Same case-scoped RLS shape as
-- case_calendar_items / case_bundle_items: a row is readable and writable only
-- by the user who owns it.

create extension if not exists pgcrypto;

create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.case_notes enable row level security;

drop policy if exists "Users can read their case notes" on public.case_notes;
create policy "Users can read their case notes"
  on public.case_notes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their case notes" on public.case_notes;
create policy "Users can insert their case notes"
  on public.case_notes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their case notes" on public.case_notes;
create policy "Users can update their case notes"
  on public.case_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their case notes" on public.case_notes;
create policy "Users can delete their case notes"
  on public.case_notes
  for delete
  using (auth.uid() = user_id);

-- Pinned first, then newest — the order the Notes page renders in.
create index if not exists case_notes_case_idx
  on public.case_notes (case_id, pinned desc, created_at desc);
