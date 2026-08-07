-- Track B, step 8: make search_legal_semantic actually use the HNSW index.
--
-- Paste into the Supabase SQL editor (idempotent). Run after trackb6.
--
-- THE DEFECT. The index created in trackb3
--   create index legal_embeddings_hnsw
--     on public.legal_embeddings using hnsw (embedding vector_cosine_ops);
-- has been decorative since trackb5. pgvector's HNSW accelerates exactly one
-- query shape:
--
--   order by embedding <=> query_embedding limit N
--
-- and trackb5/trackb6 present neither half of it. The WHERE clause filters on
-- (1 - (embedding <=> query_embedding)) >= similarity_floor, an expression the
-- index cannot answer, and the ORDER BY is on the penalty-adjusted score rather
-- than on the distance operator. So Postgres computes the distance for every
-- row and sorts: a full sequential scan of the embeddings table.
--
-- Measured on the live database: ~5s at 7,547 chunks, 7.3s at ~9,150, and the
-- eval times out. It degrades linearly with the corpus, so ingesting the
-- procedure rules is what pushed it over the edge.
--
-- THE FIX. Two stages, the standard pgvector filtered-search pattern.
--
--   1. Candidate selection in the one shape HNSW can accelerate — no
--      expression filter, ordered by the raw distance operator, with a limit.
--   2. Everything else applied to those candidates only: the in-force and
--      jurisdiction guarantees, the similarity floor, the one-row-per-provision
--      dedupe, the amending-content penalty, and the final ordering.
--
-- Nothing about the guarantees, the dedupe or the penalty changes. The stage-2
-- block below is trackb6's body verbatim except that it reads from `candidates`
-- instead of scanning `legal_embeddings`.
--
-- APPROXIMATION. HNSW is approximate, so stage 1 can in principle miss a row an
-- exact scan would have found. Two things keep that from mattering:
--
--   * CANDIDATE_LIMIT is 200 for a match_limit the app sets to 8 and the eval
--     to 20 — a 10-25x margin, so filtering and dedupe cannot starve the result
--     set even if most candidates are dropped.
--   * hnsw.ef_search is raised to 400 on the function itself. This matters more
--     than it looks: pgvector's HNSW scan returns at most ef_search rows, and
--     the default is 40 — so without this, "limit 200" would quietly yield 40
--     candidates and recall would fall off a cliff. It is set as a function
--     attribute rather than a session GUC so every caller gets it, including
--     PostgREST, which pools connections and would not carry a SET.
--
-- The eval is the correctness guard: statute cases must be UNCHANGED against
-- the pre-rules baseline. If any of them regress, raise CANDIDATE_LIMIT and
-- ef_search together (ef_search must stay >= the candidate limit) and re-run —
-- do not accept a regression as the price of the speed-up.
--
-- Signature and returned columns are identical to trackb4/5/6, so
-- create-or-replace is sufficient and no overload can linger.

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
-- Must be >= the candidate limit below, or the index returns fewer rows than
-- stage 1 asks for. See the APPROXIMATION note above.
set hnsw.ef_search = 400
as $$
  -- ---------------------------------------------------------------------
  -- Stage 1: HNSW candidate selection.
  --
  -- Every clause here is load-bearing for index use. Do not add a filter on
  -- the distance expression, and do not change the ORDER BY: either one sends
  -- this back to a sequential scan. The corpus is deliberately NOT filtered
  -- here — provisions and guidance share the index, and post-filtering one out
  -- would shrink the candidate pool for the other.
  -- ---------------------------------------------------------------------
  with candidates as (
    select
      e.provision_id,
      e.chunk_id,
      e.corpus,
      e.content,
      (1 - (e.embedding <=> query_embedding))::real as similarity
    from public.legal_embeddings e
    where (model_filter is null or e.embedding_model = model_filter)
    order by e.embedding <=> query_embedding
    limit 200
  ),
  -- ---------------------------------------------------------------------
  -- Stage 2: trackb6's body, over the candidates only.
  -- ---------------------------------------------------------------------
  matches as (
    select
      'provision'::text as corpus,
      c.similarity,
      i.title,
      i.jurisdiction,
      i.type::text as source_type,
      p.heading,
      c.content,
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
      c.provision_id::text as dedupe_key,
      public.is_amending_content(p.heading, c.content) as amending
    from candidates c
    join public.legal_provisions  p on p.id = c.provision_id
    join public.legal_instruments i on i.id = p.instrument_id
    where c.corpus = 'provision'
      and p.is_active and i.is_active
      -- The in-force guarantee.
      and (include_not_in_force or (p.in_force is true and p.content_omitted = false))
      -- The jurisdiction guarantee.
      and (include_other_jurisdictions or public.extent_covers_england_wales(p.extent))
      and c.similarity >= similarity_floor

    union all

    select
      'guidance'::text as corpus,
      c.similarity,
      s.title,
      s.jurisdiction,
      s.source_type,
      ch.heading,
      c.content,
      ch.citation_label,
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
      c.chunk_id::text as dedupe_key,
      false as amending
    from candidates c
    join public.legal_chunks  ch on ch.id = c.chunk_id
    join public.legal_sources s on s.id = ch.source_id
    where c.corpus = 'guidance'
      and s.is_active
      and c.similarity >= similarity_floor
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
  'Selects candidates through the HNSW index, then applies the in-force and '
  'England-&-Wales guarantees, the similarity floor, one-row-per-provision '
  'dedupe and the amending-content penalty to those candidates. Returns one '
  'row per provision, labelled with a real citation.';

-- ===========================================================================
-- VERIFICATION
--
-- Run all three. The function carries a SET clause, which prevents SQL
-- inlining, so an EXPLAIN of the function call shows only "Function Scan" —
-- hence check (1) runs stage 1 standalone to see the plan itself.
-- ===========================================================================

-- (1) The index is used. Look for "Index Scan using legal_embeddings_hnsw".
--     A "Seq Scan on legal_embeddings" here means the fix did not take.
set hnsw.ef_search = 400;
explain (analyze, buffers)
with probe as (select embedding from public.legal_embeddings limit 1)
select e.provision_id, (1 - (e.embedding <=> (select embedding from probe)))::real
from public.legal_embeddings e
where ('text-embedding-3-large' is null or e.embedding_model = 'text-embedding-3-large')
order by e.embedding <=> (select embedding from probe)
limit 200;

-- (2) End-to-end latency. Expect well under 500ms; it was ~7,300ms.
explain (analyze)
select * from public.search_legal_semantic(
  (select embedding from public.legal_embeddings limit 1),
  8, 0.35, false, 'text-embedding-3-large', false
);

-- (3) It still returns sensible rows, and every one of them is in force and
--     extends to England & Wales. Expect 8 rows, all true.
select
  citation_label,
  round(similarity::numeric, 4) as similarity,
  in_force,
  public.extent_covers_england_wales(extent) as covers_ew
from public.search_legal_semantic(
  (select embedding from public.legal_embeddings limit 1),
  8, 0.35, false, 'text-embedding-3-large', false
);
