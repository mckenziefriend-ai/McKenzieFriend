-- Track B, step 5: provision-level territorial extent.
--
-- Paste into the Supabase SQL editor (idempotent). Run after:
--   supabase/trackb1_legal_instruments_provisions.sql
--   supabase/trackb2_provision_status.sql
--   supabase/trackb3_semantic_index.sql
--
-- WHY: jurisdiction was captured only at instrument level, which is too coarse.
-- The Civil Partnership Act 2004 is 1,530 provisions — 21% of the whole corpus —
-- and 614 of them (40%) are Scotland-only or Northern-Ireland-only. Asking
-- "what factors does the court consider when dividing finances on divorce?"
-- returned nine Civil Partnership Act rows in the top twelve, several of them
-- N.I. schedules, and pushed Matrimonial Causes Act 1973 s.25 down to 9th.
--
-- Extent is captured VERBATIM from CLML's RestrictExtent, never inferred.
-- It is hierarchical: only 13 of the MCA's 119 provisions carry the attribute
-- themselves, the rest inherit it from an ancestor, so the ingester resolves it
-- the same way it resolves version date and status.

alter table public.legal_provisions
  add column if not exists extent text;

comment on column public.legal_provisions.extent is
  'Territorial extent captured verbatim from CLML RestrictExtent, resolved '
  'through ancestor inheritance (e.g. ''E+W'', ''E+W+S+N.I.'', ''S'', ''N.I.''). '
  'Null means the source gave none anywhere in the ancestry — treated as '
  'applicable rather than hidden.';

create index if not exists legal_provisions_extent_idx
  on public.legal_provisions(extent);

-- ---------------------------------------------------------------------------
-- Does an extent apply in England & Wales?
--
-- CONSERVATIVE BY DESIGN: include when any component is E or W, and include
-- when the extent is unknown. Exclude only when every component is S or N.I.
-- Wrongly hiding a real E&W provision is far worse than showing an ambiguous
-- one, so the null case resolves to "include".
--
-- Component matching, not substring matching: 'N.I.' must not be judged by
-- whether the string happens to contain a letter.
--
-- The test is framed as "is EVERY component known to be outside E&W?" rather
-- than "does it contain E or W?". The latter would exclude any extent we do
-- not recognise, inverting the conservative intent. On the real corpus both
-- agree exactly; they differ only on unseen values, where this one fails safe.
--
-- Mirrors extentCoversEnglandWales() in lib/legal/extent.ts — keep in step.
-- ---------------------------------------------------------------------------
create or replace function public.extent_covers_england_wales(extent text)
returns boolean
language sql
immutable
as $$
  select
    case
      when extent is null or btrim(extent) = '' then true
      else not coalesce(
        (
          select bool_and(upper(btrim(part)) in ('S', 'N.I.', 'NI'))
          from unnest(string_to_array(extent, '+')) as part
          where btrim(part) <> ''
        ),
        false
      )
    end;
$$;

comment on function public.extent_covers_england_wales is
  'True when a CLML RestrictExtent value applies in England and/or Wales, or is '
  'unknown. False only for extents wholly outside E&W (S-only, N.I.-only).';

-- ---------------------------------------------------------------------------
-- Rebuild both retrieval functions with the extent filter.
--
-- include_other_jurisdictions mirrors include_not_in_force: E&W is the default
-- because the product is pinned to England & Wales, but the escape hatch stays
-- open rather than being baked in.
--
-- DROP THE OLD SIGNATURES FIRST. Both functions gain a parameter, and Postgres
-- treats a changed parameter list as a NEW overload rather than a replacement —
-- "create or replace" would leave the trackb3 versions in place alongside these.
-- PostgREST resolves RPC calls by the argument names supplied, so a lingering
-- overload can produce "could not choose the best candidate function", and
-- worse, a call that omits include_other_jurisdictions could silently bind to
-- the OLD function and return unfiltered, non-E&W results.
--
-- Dropping by exact argument types is safe here: these are the trackb3
-- signatures, and "if exists" makes it a no-op on a fresh database.
-- ---------------------------------------------------------------------------
drop function if exists public.search_legal_semantic(
  vector, int, real, boolean, text
);

drop function if exists public.lookup_legal_provisions(
  text[], text, int, boolean
);

create or replace function public.search_legal_semantic(
  query_embedding vector(1536),
  match_limit int default 8,
  similarity_floor real default 0.35,
  include_not_in_force boolean default false,
  model_filter text default null,
  include_other_jurisdictions boolean default false
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
  extent text,
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
    p.extent,
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
    -- The jurisdiction guarantee.
    and (include_other_jurisdictions or public.extent_covers_england_wales(p.extent))
    and (1 - (e.embedding <=> query_embedding)) >= similarity_floor

  union all

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
    null::text as extent,
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
  'text-omitted) and provisions that do not extend to England & Wales, unless '
  'the corresponding include_ flag is set. Every row carries its currency and '
  'extent so the caller can re-check them.';

create or replace function public.lookup_legal_provisions(
  provision_refs text[],
  instrument_hint text default null,
  match_limit int default 6,
  include_not_in_force boolean default false,
  include_other_jurisdictions boolean default false
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
  extent text,
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
    1.0::real as similarity,
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
    p.extent,
    p.has_unapplied_amendments,
    p.amendment_note,
    i.up_to_date_to,
    p.source_url
  from public.legal_provisions  p
  join public.legal_instruments i on i.id = p.instrument_id
  where p.ref = any (provision_refs)
    and p.is_active and i.is_active
    and (include_not_in_force or (p.in_force is true and p.content_omitted = false))
    and (include_other_jurisdictions or public.extent_covers_england_wales(p.extent))
    and (
      instrument_hint is null
      or i.title ilike '%' || instrument_hint || '%'
      or i.leg_gov_ref ilike '%' || instrument_hint || '%'
    )
  order by i.title, p.position
  limit greatest(1, least(match_limit, 20));
$$;

comment on function public.lookup_legal_provisions is
  'Exact provision lookup by ref, optionally narrowed by an instrument '
  'title/ref fragment. Applies the same in-force and England-&-Wales extent '
  'guarantees as search_legal_semantic.';
