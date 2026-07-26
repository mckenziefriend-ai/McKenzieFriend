-- Ranked full-text retrieval over legal_chunks for the case-chat RAG path.
-- Paste into the Supabase SQL editor (idempotent).
--
-- Replaces the previous unranked, unfiltered retrieval:
--   * ranks matches with ts_rank and returns the best first
--   * applies a relevance floor so weak/irrelevant matches are dropped
--     rather than injected as if authoritative
--   * joins through to legal_sources for citation metadata
--
-- lib/legal/retrieval.ts calls this via supabase.rpc("search_legal_chunks", ...)
-- and falls back to an unranked textSearch only if this function is absent.

create or replace function public.search_legal_chunks(
  query_text text,
  match_limit int default 8,
  rank_floor real default 0.02
)
returns table (
  heading text,
  content text,
  citation_label text,
  title text,
  jurisdiction text,
  source_type text,
  rank real
)
language sql
stable
as $$
  select
    c.heading,
    c.content,
    c.citation_label,
    s.title,
    s.jurisdiction,
    s.source_type,
    ts_rank(
      to_tsvector('english', coalesce(c.content, '')),
      websearch_to_tsquery('english', query_text)
    ) as rank
  from public.legal_chunks c
  left join public.legal_sources s on s.id = c.source_id
  where websearch_to_tsquery('english', query_text) @@
        to_tsvector('english', coalesce(c.content, ''))
    and ts_rank(
      to_tsvector('english', coalesce(c.content, '')),
      websearch_to_tsquery('english', query_text)
    ) >= rank_floor
  order by rank desc
  limit greatest(1, least(match_limit, 20));
$$;

-- Column names (legal_chunks.source_id/content/citation_label/heading,
-- legal_sources.id/title/jurisdiction/source_type) match
-- phase9_legal_intelligence_setup.sql. The ts_vector expression matches the
-- existing legal_chunks_content_search_idx GIN index so it is used.
