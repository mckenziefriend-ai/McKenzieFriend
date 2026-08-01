-- Track B, step 4: semantic index over the legal corpus.
--
-- Paste into the Supabase SQL editor (idempotent). Run after:
--   supabase/trackb1_legal_instruments_provisions.sql
--   supabase/trackb2_provision_status.sql
--
-- One embeddings table spans BOTH corpora (legislation provisions and the
-- hand-curated guidance chunks) so a single similarity query returns one
-- ranked list rather than two lists that have to be merged by the caller.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Embeddings
-- ---------------------------------------------------------------------------
create table if not exists public.legal_embeddings (
  id uuid primary key default gen_random_uuid(),

  -- Exactly one parent: a legislation provision or a guidance chunk.
  corpus text not null check (corpus in ('provision', 'guidance')),
  provision_id uuid references public.legal_provisions(id) on delete cascade,
  chunk_id     uuid references public.legal_chunks(id)     on delete cascade,

  -- Long provisions are split on subsection boundaries; index 0 means the
  -- provision was embedded whole. Sub-chunks always resolve to their parent,
  -- so a citation stays "s. 8 Children Act 1989" either way.
  sub_chunk_index integer not null default 0,

  -- The exact text embedded, and its hash. The hash drives idempotent
  -- re-embedding: unchanged text with the same model is never re-sent.
  content text not null,
  content_hash text not null,

  embedding vector(1536) not null,

  -- Recorded from what the provider actually returned, never assumed. A model
  -- switch therefore ADDS rows rather than overwriting, so the new index can be
  -- built and verified before the old vectors are deleted.
  embedding_model text not null,
  embedding_dims  integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint legal_embeddings_one_parent
    check (num_nonnulls(provision_id, chunk_id) = 1),
  constraint legal_embeddings_corpus_parent
    check (
      (corpus = 'provision' and provision_id is not null) or
      (corpus = 'guidance'  and chunk_id     is not null)
    )
);

-- Idempotency key. Includes the model so two models can coexist during a switch.
--
-- This MUST be a single non-partial constraint. An earlier version used two
-- partial unique indexes (one per corpus, WHERE provision_id/chunk_id is not
-- null). Postgres cannot infer a partial index from ON CONFLICT (columns)
-- without also being given its predicate, and PostgREST/supabase-js has no way
-- to express that predicate — so every upsert failed with "no unique or
-- exclusion constraint matching the ON CONFLICT specification".
--
-- NULLS NOT DISTINCT is load-bearing, not decoration: exactly one of
-- provision_id/chunk_id is null on every row, and under default NULLS DISTINCT
-- semantics two otherwise-identical rows would compare unequal and duplicate
-- silently.
--
-- Idempotent against the already-applied original: drop the old partial
-- indexes if present, then add the constraint only if it is not already there
-- (Postgres has no ADD CONSTRAINT IF NOT EXISTS).
drop index if exists public.legal_embeddings_provision_unique;
drop index if exists public.legal_embeddings_guidance_unique;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'legal_embeddings_parent_unique'
      and conrelid = 'public.legal_embeddings'::regclass
  ) then
    alter table public.legal_embeddings
      add constraint legal_embeddings_parent_unique
      unique nulls not distinct
        (provision_id, chunk_id, sub_chunk_index, embedding_model);
  end if;
end
$$;

create index if not exists legal_embeddings_model_idx
  on public.legal_embeddings (embedding_model);

-- Cosine index. pgvector caps HNSW at 2000 dimensions, which is why the
-- pipeline requests 1536 dimensions rather than the model's native 3072.
create index if not exists legal_embeddings_hnsw
  on public.legal_embeddings using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- RLS: public reference data, readable by any signed-in user.
-- ---------------------------------------------------------------------------
alter table public.legal_embeddings enable row level security;

drop policy if exists "Authenticated users can read legal embeddings" on public.legal_embeddings;
create policy "Authenticated users can read legal embeddings"
  on public.legal_embeddings
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Unified semantic search
--
-- SAFETY: by default this returns ONLY provisions that are in force. Repealed,
-- prospective and text-omitted provisions are all in_force = false and are
-- excluded here. Family Law Act 1996 Part 2 alone is 102 prospective
-- provisions — real law that never commenced and must never be presented as
-- current. include_not_in_force exists for a future "historical view" and
-- defaults to false.
--
-- Currency fields are returned on every row so the caller can display them and
-- so any future leak is visible rather than silent.
-- ---------------------------------------------------------------------------
create or replace function public.search_legal_semantic(
  query_embedding vector(1536),
  match_limit int default 8,
  similarity_floor real default 0.35,
  include_not_in_force boolean default false,
  model_filter text default null
)
returns table (
  corpus text,
  similarity real,
  title text,
  jurisdiction text,
  source_type text,
  heading text,
  content text,
  citation_label text,
  leg_gov_ref text,
  provision_ref text,
  in_force boolean,
  status text,
  content_omitted boolean,
  has_unapplied_amendments boolean,
  amendment_note text,
  up_to_date_to date,
  source_url text
)
language sql
stable
as $$
  -- Legislation
  select
    'provision'::text as corpus,
    (1 - (e.embedding <=> query_embedding))::real as similarity,
    i.title,
    i.jurisdiction,
    i.type::text as source_type,
    p.heading,
    e.content,
    (i.title || ' ' || p.ref) as citation_label,
    i.leg_gov_ref,
    p.ref as provision_ref,
    p.in_force,
    p.status,
    p.content_omitted,
    p.has_unapplied_amendments,
    p.amendment_note,
    i.up_to_date_to,
    p.source_url
  from public.legal_embeddings e
  join public.legal_provisions  p on p.id = e.provision_id
  join public.legal_instruments i on i.id = p.instrument_id
  where e.corpus = 'provision'
    and (model_filter is null or e.embedding_model = model_filter)
    and p.is_active and i.is_active
    -- The in-force guarantee.
    and (include_not_in_force or (p.in_force is true and p.content_omitted = false))
    and (1 - (e.embedding <=> query_embedding)) >= similarity_floor

  union all

  -- Hand-curated guidance
  select
    'guidance'::text as corpus,
    (1 - (e.embedding <=> query_embedding))::real as similarity,
    s.title,
    s.jurisdiction,
    s.source_type,
    c.heading,
    e.content,
    c.citation_label,
    null::text as leg_gov_ref,
    null::text as provision_ref,
    true as in_force,
    null::text as status,
    false as content_omitted,
    false as has_unapplied_amendments,
    null::text as amendment_note,
    null::date as up_to_date_to,
    s.source_url
  from public.legal_embeddings e
  join public.legal_chunks  c on c.id = e.chunk_id
  join public.legal_sources s on s.id = c.source_id
  where e.corpus = 'guidance'
    and (model_filter is null or e.embedding_model = model_filter)
    and s.is_active
    and (1 - (e.embedding <=> query_embedding)) >= similarity_floor

  order by similarity desc
  limit greatest(1, least(match_limit, 50));
$$;

comment on function public.search_legal_semantic is
  'Cosine similarity search across legislation provisions and guidance chunks. '
  'Excludes provisions that are not in force (repealed / prospective / '
  'text-omitted) unless include_not_in_force is true. Every row carries its '
  'currency fields so the caller can display and re-check them.';

-- ---------------------------------------------------------------------------
-- Direct citation lookup ("s. 8 Children Act 1989").
-- Embeddings are mediocre at exact citation recall, and this is one of the most
-- predictable queries this product receives, so exact hits are merged above
-- semantic hits by the caller.
-- ---------------------------------------------------------------------------
create or replace function public.lookup_legal_provisions(
  provision_refs text[],
  instrument_hint text default null,
  match_limit int default 6,
  include_not_in_force boolean default false
)
returns table (
  corpus text,
  similarity real,
  title text,
  jurisdiction text,
  source_type text,
  heading text,
  content text,
  citation_label text,
  leg_gov_ref text,
  provision_ref text,
  in_force boolean,
  status text,
  content_omitted boolean,
  has_unapplied_amendments boolean,
  amendment_note text,
  up_to_date_to date,
  source_url text
)
language sql
stable
as $$
  select
    'provision'::text as corpus,
    1.0::real as similarity,       -- exact citation match
    i.title,
    i.jurisdiction,
    i.type::text as source_type,
    p.heading,
    p.content,
    (i.title || ' ' || p.ref) as citation_label,
    i.leg_gov_ref,
    p.ref as provision_ref,
    p.in_force,
    p.status,
    p.content_omitted,
    p.has_unapplied_amendments,
    p.amendment_note,
    i.up_to_date_to,
    p.source_url
  from public.legal_provisions  p
  join public.legal_instruments i on i.id = p.instrument_id
  where p.ref = any (provision_refs)
    and p.is_active and i.is_active
    and (include_not_in_force or (p.in_force is true and p.content_omitted = false))
    and (
      instrument_hint is null
      or i.title ilike '%' || instrument_hint || '%'
      or i.leg_gov_ref ilike '%' || instrument_hint || '%'
    )
  order by i.title, p.position
  limit greatest(1, least(match_limit, 20));
$$;

comment on function public.lookup_legal_provisions is
  'Exact provision lookup by ref (e.g. section/8), optionally narrowed by an '
  'instrument title/ref fragment. Applies the same in-force guarantee as '
  'search_legal_semantic.';
