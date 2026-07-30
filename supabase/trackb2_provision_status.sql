-- Track B, step 2: capture the raw CLML provision status.
--
-- Paste into the Supabase SQL editor (idempotent). Run after
-- supabase/trackb1_legal_instruments_provisions.sql.
--
-- Why a separate column rather than folding everything into in_force:
-- "not yet commenced" and "repealed" are both "not in force", but they are
-- very different facts for a litigant. Collapsing them loses information we
-- were given for free. Capture, don't compute.

alter table public.legal_provisions
  add column if not exists status text;

comment on column public.legal_provisions.status is
  'Raw CLML Status attribute captured verbatim from legislation.gov.uk '
  '(e.g. ''Repealed'', ''Prospective''); null when the source sets none. '
  'Never inferred — if legislation.gov.uk did not state it, this is null.';

create index if not exists legal_provisions_status_idx
  on public.legal_provisions(status)
  where status is not null;

-- Some repealed provisions carry NO Status attribute: legislation.gov.uk
-- renders them as a dotted heading with an empty <Text/>, and states the
-- repeal only in the annotation block. Verified against the live page for
-- Children Act 1989 s.54, which reads:
--   "F1 54 . . . .  |  Textual Amendments  |  F1 S. 54 repealed (1.4.2002) ..."
--
-- We record the observable fact (the source carries no operative text) rather
-- than asserting a status we did not read. This is deliberately distinguishable
-- from a captured status = 'Repealed'.
alter table public.legal_provisions
  add column if not exists content_omitted boolean not null default false;

comment on column public.legal_provisions.content_omitted is
  'True when the source provided no operative text for this provision '
  '(empty <Text/>), which in practice means repealed/omitted. Observed, not '
  'captured from a Status attribute — see status for the captured value. '
  'in_force is false when status is Repealed/Prospective OR this is true. '
  'Retrieval should exclude these: they have no text to cite.';

create index if not exists legal_provisions_content_omitted_idx
  on public.legal_provisions(content_omitted)
  where content_omitted;
