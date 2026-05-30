-- Phase 3 documents setup for McKenzie Friend AI
-- Run this in Supabase SQL editor before using the Documents page.

create extension if not exists pgcrypto;

create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_type text,
  file_size bigint,
  category text default 'Other',
  summary text,
  created_at timestamptz not null default now()
);

alter table public.case_documents enable row level security;

drop policy if exists "Users can read their case documents" on public.case_documents;
create policy "Users can read their case documents"
  on public.case_documents
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their case documents" on public.case_documents;
create policy "Users can insert their case documents"
  on public.case_documents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their case documents" on public.case_documents;
create policy "Users can update their case documents"
  on public.case_documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their case documents" on public.case_documents;
create policy "Users can delete their case documents"
  on public.case_documents
  for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false)
on conflict (id) do nothing;

drop policy if exists "Users can read their own stored case documents" on storage.objects;
create policy "Users can read their own stored case documents"
  on storage.objects
  for select
  using (
    bucket_id = 'case-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can upload their own stored case documents" on storage.objects;
create policy "Users can upload their own stored case documents"
  on storage.objects
  for insert
  with check (
    bucket_id = 'case-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own stored case documents" on storage.objects;
create policy "Users can update their own stored case documents"
  on storage.objects
  for update
  using (
    bucket_id = 'case-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own stored case documents" on storage.objects;
create policy "Users can delete their own stored case documents"
  on storage.objects
  for delete
  using (
    bucket_id = 'case-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
