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
  'in_force is false when this is ''Repealed'' or ''Prospective''.';

create index if not exists legal_provisions_status_idx
  on public.legal_provisions(status)
  where status is not null;
