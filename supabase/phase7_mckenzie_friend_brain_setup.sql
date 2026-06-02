-- Phase 7 setup: legal source layer for McKenzie Friend AI.
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.legal_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text default 'Guidance',
  jurisdiction text default 'England and Wales',
  source_url text,
  content text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.legal_sources enable row level security;

drop policy if exists "Authenticated users can read legal sources" on public.legal_sources;
create policy "Authenticated users can read legal sources"
  on public.legal_sources
  for select
  using (auth.role() = 'authenticated');

create index if not exists legal_sources_active_updated_idx
  on public.legal_sources (is_active, updated_at desc);

insert into public.legal_sources (title, source_type, jurisdiction, source_url, content, is_active)
values (
  'Practice Guidance: McKenzie Friends (Civil and Family Courts)',
  'Practice Guidance',
  'England and Wales',
  null,
  'McKenzie Friend role summary for civil and family courts in England and Wales. Litigants in person have the right to reasonable assistance from a layperson, sometimes called a McKenzie Friend. A litigant assisted by a McKenzie Friend remains a litigant in person. A McKenzie Friend has no independent right to provide assistance and has no right to act as advocate or conduct litigation unless the court grants specific rights. A McKenzie Friend may provide moral support, take notes, help with case papers, and quietly give advice on any aspect of the conduct of the case. A McKenzie Friend may not act as the litigant’s agent in relation to proceedings, manage the case outside court by signing court documents, address the court, make oral submissions, or examine witnesses. The court can refuse or limit assistance where required by justice and fairness, including where assistance is improper, unreasonable, undermines the administration of justice, uses the litigant as a puppet, amounts to conducting litigation, or the McKenzie Friend does not understand confidentiality. Rights of audience and conduct of litigation are separate rights and are normally only granted case by case. Litigants may communicate court information and filed evidence to a McKenzie Friend for the purpose of obtaining advice or assistance. This system should assist with preparation, organisation, drafting, understanding and support, while avoiding representation, litigation conduct, submissions, witness examination, or signing/sending documents on behalf of the litigant.',
  true
)
on conflict do nothing;

-- Future legal sources to add here:
-- Family Procedure Rules, Family Practice Directions, Civil Procedure Rules,
-- Civil Practice Directions, Pre-action Protocols, HMCTS/GOV.UK guidance,
-- court form guidance, relevant statutes and carefully curated case law.
