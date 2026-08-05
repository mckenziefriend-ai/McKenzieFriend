-- Track B, step 6: retrieval ranking.
--
-- Paste into the Supabase SQL editor (idempotent). Run after trackb4.
--
-- Two changes, both measured against the 13-case retrieval eval
-- (scripts/eval): hit@8 11/13 -> 12/13, MRR 0.700 -> 0.715, no regressions.
--
-- 1. DEDUPE BY PROVISION. Long provisions are split into sub-chunks, each its
--    own embedding row, and the function returned them independently — so one
--    provision could occupy several slots of match_limit. Measured: 12
--    duplicate rows across 10 queries at k=20, and up to 3 of the app's 8
--    slots wasted on repeats of a single provision. Only the best-scoring
--    sub-chunk of each provision is now returned. This is a defect fix and is
--    justified independently of ranking.
--
-- 2. AMENDING-CONTENT PENALTY. Amending instructions ("Section 10 is amended
--    as follows ... for (b) substitute") are lexically saturated with a topic
--    while being useless as an answer: Children and Families Act 2014 Sch 2
--    ranked #1 for "child arrangements order", pushing the operative
--    Children Act 1989 s.8 to 14th, outside what the app shows the model.
--
--    An earlier attempt penalised SCHEDULE paragraphs instead. It scored well
--    until the eval set was extended with questions whose correct answer is a
--    schedule, and then regressed two of them (Children Act 1989 Sch 1 from
--    1st to 4th; Civil Partnership Act 2004 Sch 5 from 4th to 6th) and lowered
--    overall MRR. Schedules are frequently the operative law — the Convention
--    rights live in one. The culprit is amending content, not schedules, and
--    this penalty leaves every schedule-answer case untouched.
--
-- The penalty re-ranks; it never removes. similarity_floor is still applied to
-- the RAW similarity, so a demoted row can fall down the list but cannot drop
-- out of the result set, and the returned `similarity` remains the true
-- semantic score rather than the adjusted one.

-- ---------------------------------------------------------------------------
-- Amending-instruction detector.
--
-- Deliberately lexical and narrow. A false positive is demoted by 0.10, not
-- excluded, so the cost of over-matching is small and bounded.
-- ---------------------------------------------------------------------------
create or replace function public.is_amending_content(heading text, content text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(heading, '') ilike '%amendment%'
    or coalesce(content, '') ~* 'is amended as follows'
    or coalesce(content, '') ~* 'for .{1,80} substitute'
    or coalesce(content, '') ~* 'insert(ed)? after';
$$;

comment on function public.is_amending_content is
  'True when a provision reads as amending instructions rather than operative '
  'law. Used only to demote in ranking — never to exclude.';

-- ---------------------------------------------------------------------------
-- Ranked search. Signature and returned columns are unchanged from trackb4, so
-- create-or-replace is sufficient and no overload can linger.
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
  'Returns one row per provision (best sub-chunk). Excludes provisions not in '
  'force and those outside England & Wales unless explicitly included. '
  'Amending instructions are demoted in ranking but never excluded.';
