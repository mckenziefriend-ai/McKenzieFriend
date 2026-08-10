-- Track B, step 7: real citation labels.
--
-- Paste into the Supabase SQL editor (idempotent). Run after trackb5.
--
-- citation_label is the string the model is given to cite, and the string the
-- user sees under an answer. Until now it was built as (title || ' ' || ref),
-- which produced machine paths rather than citations:
--
--   before: "Children Act 1989 section/8"
--   after:  "Children Act 1989, s. 8"
--
--   before: "The Family Procedure Rules 2010 rule/12.3"
--   after:  "Family Procedure Rules 2010, r. 12.3"
--
-- This matters more now that the procedure rules are in the corpus. A rule
-- cited as "s. 12.3" is not merely ugly, it is wrong — it points a litigant at
-- a section of an Act that does not exist. The leading "The " is dropped
-- because instruments are cited without it.
--
-- This function mirrors provisionLabel() in scripts/lib/clml.ts. Keep the two
-- in step: the TypeScript one writes amendment notes, this one labels sources.
--
-- Nothing else changes. Both functions keep the exact signature and return
-- columns they had in trackb4/trackb5, so create-or-replace is sufficient and
-- no overload can linger; search_legal_semantic keeps trackb5's dedupe and
-- amending-content penalty verbatim.

-- ---------------------------------------------------------------------------
-- The label itself.
--
-- An unrecognised ref shape falls back to the raw ref after the comma rather
-- than to a guess. Human Rights Act 1998 Sch 1 nests part and chapter above
-- the paragraph, and collapsing that to "Sch. 1 para. 1" would give two
-- different Convention Articles the same citation. A path is unhelpful; a
-- wrong citation is harmful.
-- ---------------------------------------------------------------------------
create or replace function public.provision_citation_label(
  instrument_title text,
  provision_ref text
)
returns text
language sql
immutable
as $$
  with parts as (
    select
      nullif(btrim(regexp_replace(coalesce(instrument_title, ''), '^[Tt]he\s+', '')), '') as title,
      btrim(coalesce(provision_ref, '')) as ref
  ),
  shaped as (
    select
      title,
      ref,
      -- "section/8/3/a" cites as "8(3)(a)": drop the kind, then every
      -- remaining segment becomes a bracketed level.
      regexp_replace(
        regexp_replace(ref, '^(section|rule)/', ''),
        '/([^/]+)', '(\1)', 'g'
      ) as subdivided
    from parts
  )
  select case
    when title is null and ref = '' then null::text
    when title is null then ref
    when ref = '' then title
    when ref ~ '^section/' then title || ', s. ' || subdivided
    when ref ~ '^rule/'    then title || ', r. ' || subdivided
    when ref ~ '^part/[^/]+/paragraph/[^/]+$'
      then title || ', Part ' || split_part(ref, '/', 2)
                 || ', para. ' || split_part(ref, '/', 4)
    when ref ~ '^part/[^/]+$'
      then title || ', Part ' || split_part(ref, '/', 2)
    when ref ~ '^schedule/[^/]+/paragraph/[^/]+$'
      then title || ', Sch. ' || split_part(ref, '/', 2)
                 || ' para. ' || split_part(ref, '/', 4)
    when ref ~ '^schedule/[^/]+$'
      then title || ', Sch. ' || split_part(ref, '/', 2)
    else title || ', ' || ref
  end
  from shaped;
$$;

comment on function public.provision_citation_label is
  'Formats an instrument title and provision ref as a citation — '
  '"Children Act 1989, s. 8", "Family Procedure Rules 2010, r. 12.3". '
  'Mirrors provisionLabel() in scripts/lib/clml.ts. Unrecognised ref shapes '
  'fall back to the raw ref rather than to an ambiguous citation.';

-- ---------------------------------------------------------------------------
-- Ranked search — trackb5 body, citation_label only.
-- ---------------------------------------------------------------------------
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
  with matches as (
    select
      'provision'::text as corpus,
      (1 - (e.embedding <=> query_embedding))::real as similarity,
      i.title,
      i.jurisdiction,
      i.type::text as source_type,
      p.heading,
      e.content,
      public.provision_citation_label(i.title, p.ref) as citation_label,
      i.leg_gov_ref,
      p.ref as provision_ref,
      p.in_force,
      p.status,
      p.content_omitted,
      p.extent,
      p.has_unapplied_amendments,
      p.amendment_note,
      i.up_to_date_to,
      p.source_url,
      -- One row per provision, not per sub-chunk.
      e.provision_id::text as dedupe_key,
      public.is_amending_content(p.heading, e.content) as amending
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
      s.source_url,
      e.chunk_id::text as dedupe_key,
      false as amending
    from public.legal_embeddings e
    join public.legal_chunks  c on c.id = e.chunk_id
    join public.legal_sources s on s.id = c.source_id
    where e.corpus = 'guidance'
      and (model_filter is null or e.embedding_model = model_filter)
      and s.is_active
      and (1 - (e.embedding <=> query_embedding)) >= similarity_floor
  ),
  deduped as (
    select
      matches.*,
      row_number() over (
        partition by dedupe_key
        order by similarity desc
      ) as sub_chunk_rank
    from matches
  )
  select
    corpus, similarity, title, jurisdiction, source_type, heading, content,
    citation_label, leg_gov_ref, provision_ref, in_force, status,
    content_omitted, extent, has_unapplied_amendments, amendment_note,
    up_to_date_to, source_url
  from deduped
  where sub_chunk_rank = 1
  -- Rank on the adjusted score; return the true similarity.
  order by (similarity - case when amending then 0.10 else 0 end) desc
  limit greatest(1, least(match_limit, 50));
$$;

comment on function public.search_legal_semantic is
  'Cosine similarity search across legislation provisions and guidance chunks. '
  'Returns one row per provision (best sub-chunk), labelled with a real '
  'citation. Excludes provisions not in force and those outside England & '
  'Wales unless explicitly included. Amending instructions are demoted in '
  'ranking but never excluded.';

-- ---------------------------------------------------------------------------
-- Exact lookup — trackb4 body, citation_label only.
-- ---------------------------------------------------------------------------
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
    public.provision_citation_label(i.title, p.ref) as citation_label,
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

-- ---------------------------------------------------------------------------
-- Self-check. Expected output, one row:
--   Children Act 1989, s. 8 | Children Act 1989, s. 8(3) |
--   Family Procedure Rules 2010, r. 12.3 | Civil Procedure Rules 1998, r. 7.2 |
--   Children Act 1989, Sch. 1 para. 1 | Civil Procedure Rules 1998, Part 7 |
--   Human Rights Act 1998, schedule/1/part/I/chapter/5/paragraph/1
-- ---------------------------------------------------------------------------
select
  public.provision_citation_label('Children Act 1989', 'section/8'),
  public.provision_citation_label('Children Act 1989', 'section/8/3'),
  public.provision_citation_label('The Family Procedure Rules 2010', 'rule/12.3'),
  public.provision_citation_label('The Civil Procedure Rules 1998', 'rule/7.2'),
  public.provision_citation_label('Children Act 1989', 'schedule/1/paragraph/1'),
  public.provision_citation_label('The Civil Procedure Rules 1998', 'part/7'),
  public.provision_citation_label('Human Rights Act 1998',
    'schedule/1/part/I/chapter/5/paragraph/1');
