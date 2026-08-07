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
-- Measured on the live database at 9,905 embedding rows, and the spread is the
-- whole story:
--
--   cold / evicted   6,729ms, 10,556ms, and one call dropping the connection
--                    outright after 18,348ms
--   warm burst       127-286ms, median 175ms
--
-- The embeddings are roughly 61MB. Once they are resident a sequential scan is
-- comfortably inside budget, which is why a tight measurement loop makes this
-- look healthy — the loop is what keeps them resident. Real traffic arrives
-- minutes apart on an instance with other demands on its memory, so the table
-- is evicted between queries and the cold column is what users actually get.
--
-- Two things follow. First, do not accept a fast warm number as evidence the
-- index is being used; only the EXPLAIN in check (2) settles that. Second, the
-- cold cost grows linearly with the corpus while HNSW's does not, so this gets
-- worse with every ingest even if a warm probe stays green. Ingesting the
-- procedure rules is what pushed the cold case into connection drops.
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
-- instead of scanning `legal_embeddings`, and that its references are now
-- qualified (see LANGUAGE below).
--
-- APPROXIMATION. HNSW is approximate, so stage 1 can in principle miss a row an
-- exact scan would have found. Two things keep that from mattering:
--
--   * CANDIDATE_LIMIT is 200 for a match_limit the app sets to 8 and the eval
--     to 20 — a 10-25x margin, so filtering and dedupe cannot starve the result
--     set even if most candidates are dropped.
--   * hnsw.ef_search is raised to 400 for the duration of the call. This matters
--     more than it looks: pgvector's HNSW scan returns at most ef_search rows,
--     and the default is 40 — so without this, "limit 200" would quietly yield
--     40 candidates and recall would fall off a cliff.
--
-- The eval is the correctness guard: statute cases must be UNCHANGED against
-- the pre-rules baseline. If any of them regress, raise CANDIDATE_LIMIT and
-- ef_search together (ef_search must stay >= the candidate limit) and re-run —
-- do not accept a regression as the price of the speed-up.
--
-- LANGUAGE. This is plpgsql rather than SQL, for one reason: Supabase denies the
-- function-level pin
--
--   create function ... set hnsw.ef_search = 400
--
-- while permitting the parameter itself. So the value is raised at runtime with
-- SET LOCAL in the body instead. SET LOCAL is transaction-scoped and reverts at
-- commit, which is precisely what makes it safe under PostgREST's connection
-- pooling — each RPC is its own transaction, so no setting leaks into whatever
-- reuses the connection next. A plain session SET would leak; a function
-- attribute would be cleaner still, but is not available to us here.
--
-- VOLATILITY. The function is marked volatile, not stable, and this is forced:
-- Postgres rejects SET inside a non-volatile function outright, with "SET is not
-- allowed in a non-volatile function". The body is read-only in fact — nothing
-- below writes — so the marking overstates what it does. Two consequences worth
-- knowing, neither of which bites here:
--
--   * PostgREST will only route a volatile function over POST, not GET. Every
--     caller goes through supabase-js .rpc(), which posts, so this changes
--     nothing. Do not add a GET caller without revisiting this.
--   * PostgREST runs volatile functions in a READ WRITE transaction rather than
--     the read-only one a stable function would get. We lose that guard as a
--     structural property, and are left relying on the body containing no
--     writes. Keep it that way.
--
-- Volatile also means the planner will not fold or cache repeated calls, which
-- is irrelevant for a top-level RPC invoked once per request.
--
-- Switching to plpgsql brings one hazard that does not exist in a SQL function,
-- and it is the reason for the qualification churn in stage 2. The `returns
-- table` columns become plpgsql variables, so a bare reference to `similarity`,
-- `corpus`, `title` or `in_force` is ambiguous between the variable and the
-- column — and plpgsql's default conflict resolution is to raise an error, at
-- runtime, on every call. Every such reference below is therefore qualified with
-- its CTE alias, and `#variable_conflict use_column` is declared as a guard so a
-- later edit that forgets a qualifier resolves to the column rather than
-- breaking. The IN parameters are unaffected: no column shares their names.
--
-- There is deliberately no exception handler around the SET LOCAL. A BEGIN
-- ... EXCEPTION block opens a subtransaction on every single search call, which
-- is a permanent cost to insure against a one-time deployment failure that
-- check (0) below catches immediately.
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
language plpgsql
volatile
as $$
#variable_conflict use_column
begin
  -- Transaction-scoped, so it reverts when this RPC's transaction ends and
  -- cannot leak into the next caller to reuse this pooled connection. Must be
  -- >= the candidate limit below, or the index returns fewer rows than stage 1
  -- asks for. See the APPROXIMATION note above.
  set local hnsw.ef_search = 400;

  return query
  -- -------------------------------------------------------------------
  -- Stage 1: HNSW candidate selection.
  --
  -- Every clause here is load-bearing for index use. Do not add a filter on
  -- the distance expression, and do not change the ORDER BY: either one sends
  -- this back to a sequential scan. The corpus is deliberately NOT filtered
  -- here — provisions and guidance share the index, and post-filtering one out
  -- would shrink the candidate pool for the other.
  -- -------------------------------------------------------------------
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
  -- -------------------------------------------------------------------
  -- Stage 2: trackb6's body, over the candidates only.
  -- -------------------------------------------------------------------
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
        partition by matches.dedupe_key
        order by matches.similarity desc
      ) as sub_chunk_rank
    from matches
  )
  select
    deduped.corpus,
    deduped.similarity,
    deduped.title,
    deduped.jurisdiction,
    deduped.source_type,
    deduped.heading,
    deduped.content,
    deduped.citation_label,
    deduped.leg_gov_ref,
    deduped.provision_ref,
    deduped.in_force,
    deduped.status,
    deduped.content_omitted,
    deduped.extent,
    deduped.has_unapplied_amendments,
    deduped.amendment_note,
    deduped.up_to_date_to,
    deduped.source_url
  from deduped
  where deduped.sub_chunk_rank = 1
  -- Rank on the adjusted score; return the true similarity.
  order by (deduped.similarity - case when deduped.amending then 0.10 else 0 end) desc
  limit greatest(1, least(match_limit, 50));
end;
$$;

comment on function public.search_legal_semantic is
  'Cosine similarity search across legislation provisions and guidance chunks. '
  'Selects candidates through the HNSW index, then applies the in-force and '
  'England-&-Wales guarantees, the similarity floor, one-row-per-provision '
  'dedupe and the amending-content penalty to those candidates. Returns one '
  'row per provision, labelled with a real citation.';

-- Volatility is part of what PostgREST caches about a function, and it has just
-- changed. Supabase normally reloads on DDL by event trigger; this makes it
-- certain, because a stale cache here surfaces as the RPC 404ing rather than as
-- anything that looks like a schema problem.
notify pgrst, 'reload schema';

-- ===========================================================================
-- VERIFICATION
--
-- Run all of these in order. plpgsql functions are never inlined, so an EXPLAIN of
-- the function call shows only "Function Scan" with no inner plan — hence check
-- (2) runs stage 1 standalone, with its own session-level SET, to see the plan.
-- ===========================================================================

-- (0a) Volatility landed as intended. Expect exactly one row reading 'v'. An
--      's' here means the create silently kept an older definition, and check
--      (0b) is about to fail.
select proname, provolatile
from pg_proc
where proname = 'search_legal_semantic'
  and pronamespace = 'public'::regnamespace;

-- (0b) The body's SET LOCAL is accepted at runtime. This is the one thing that
--     could break every search at once, so check it before anything else. It
--     returns rows if the parameter was settable, and errors with
--     "unrecognized configuration parameter" if it was not.
select count(*) from public.search_legal_semantic(
  (select embedding from public.legal_embeddings limit 1),
  8, 0.35, false, 'text-embedding-3-large', false
);

-- (1) The setting did not leak out of the function's transaction. Expect the
--     default (40), NOT 400. If this returns 400, SET LOCAL is behaving as a
--     session SET and would contaminate pooled connections.
show hnsw.ef_search;

-- (2) The index is used. Look for "Index Scan using legal_embeddings_hnsw".
--     A "Seq Scan on legal_embeddings" here means the fix did not take.
set hnsw.ef_search = 400;
explain (analyze, buffers)
with probe as (select embedding from public.legal_embeddings limit 1)
select e.provision_id, (1 - (e.embedding <=> (select embedding from probe)))::real
from public.legal_embeddings e
where ('text-embedding-3-large' is null or e.embedding_model = 'text-embedding-3-large')
order by e.embedding <=> (select embedding from probe)
limit 200;
reset hnsw.ef_search;

-- (3) End-to-end latency, and it still returns sensible rows with every one of
--     them in force and extending to England & Wales. Expect 8 rows, all true.
--     Read the timing against the COLD baseline of 6,729-10,556ms, not the warm
--     one — a warm sequential scan already returns in ~175ms, so a fast number
--     here on its own proves nothing. Check (2) is the real evidence.
explain (analyze)
select * from public.search_legal_semantic(
  (select embedding from public.legal_embeddings limit 1),
  8, 0.35, false, 'text-embedding-3-large', false
);

select
  citation_label,
  round(similarity::numeric, 4) as similarity,
  in_force,
  public.extent_covers_england_wales(extent) as covers_ew
from public.search_legal_semantic(
  (select embedding from public.legal_embeddings limit 1),
  8, 0.35, false, 'text-embedding-3-large', false
);
