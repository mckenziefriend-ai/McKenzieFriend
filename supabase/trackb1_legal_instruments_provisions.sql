-- Track B, step 1: legislation.gov.uk instruments + provisions with currency data.
--
-- Paste into the Supabase SQL editor (idempotent).
--
-- These tables are NEW and deliberately separate from legal_sources /
-- legal_chunks. Reconciling the two corpora is a later step; nothing here
-- touches the existing tables or lib/legal/retrieval.ts.
--
-- Currency model: "capture, don't compute". Every currency field below is
-- recorded verbatim from legislation.gov.uk's CLML. We never attempt to apply
-- amendments ourselves to derive current text.

-- ---------------------------------------------------------------------------
-- Instruments (an Act or SI as a whole)
-- ---------------------------------------------------------------------------
create table if not exists public.legal_instruments (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  type          text not null check (type in ('act', 'si')),
  jurisdiction  text not null default 'England and Wales',
  -- legislation.gov.uk path, e.g. 'ukpga/1989/41'
  leg_gov_ref   text not null unique,
  source_url    text not null,
  -- <dct:valid>: the date the revised text is up to date to
  up_to_date_to date,
  last_synced   timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Provisions (a section within an instrument)
-- ---------------------------------------------------------------------------
create table if not exists public.legal_provisions (
  id            uuid primary key default gen_random_uuid(),
  instrument_id uuid not null
                  references public.legal_instruments(id) on delete cascade,
  -- provision path relative to the instrument, e.g. 'section/8'
  ref           text not null,
  number        text,
  heading       text,
  content       text not null,
  -- P1group/@RestrictStartDate: the date this version of the text took effect
  version_date  date,
  in_force      boolean,
  -- true when legislation.gov.uk reports effects on THIS provision that are
  -- flagged RequiresApplied="true" (i.e. changes not yet applied to the text)
  has_unapplied_amendments boolean not null default false,
  amendment_note text,
  source_url    text not null,
  position      integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- makes re-syncing a provision an upsert rather than a duplicate
  unique (instrument_id, ref)
);

create index if not exists legal_provisions_instrument_idx
  on public.legal_provisions(instrument_id);

create index if not exists legal_provisions_unapplied_idx
  on public.legal_provisions(has_unapplied_amendments)
  where has_unapplied_amendments;

create index if not exists legal_instruments_active_idx
  on public.legal_instruments(is_active);

-- ---------------------------------------------------------------------------
-- RLS: public reference data, readable by any signed-in user.
-- Mirrors the legal_sources / legal_chunks pattern (including the parent
-- is_active check on the child table).
-- ---------------------------------------------------------------------------
alter table public.legal_instruments enable row level security;
alter table public.legal_provisions  enable row level security;

drop policy if exists "Authenticated users can read legal instruments" on public.legal_instruments;
create policy "Authenticated users can read legal instruments"
  on public.legal_instruments
  for select
  to authenticated
  using (is_active = true);

drop policy if exists "Authenticated users can read legal provisions" on public.legal_provisions;
create policy "Authenticated users can read legal provisions"
  on public.legal_provisions
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.legal_instruments i
      where i.id = legal_provisions.instrument_id
      and i.is_active = true
    )
  );
