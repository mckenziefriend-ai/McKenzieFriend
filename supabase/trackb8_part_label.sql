-- Track B, step 9: give procedure rules a subject signal.
--
-- Paste into the Supabase SQL editor (idempotent). Run after trackb7.
--
-- THE DEFECT. A provision is embedded as
--
--   {instrument title} {ref}
--   {heading}
--   {content}
--
-- For an Act that is enough: "Children Act 1989" states the subject, so s.8 is
-- findable on title and heading alone. For a procedure rule it is not. The
-- instrument title is identical across all ~1,800 CPR and FPR rules and says
-- nothing about subject matter, and rule headings are short and reused across
-- Parts — "Starting the claim" appears in Parts 55, 56, 62 and 63; "The
-- hearing" in 65 and 55; "Who the parties are" in six FPR Parts.
--
-- So CPR r.27.4 is embedded as
--
--   The Civil Procedure Rules 1998 rule/27.4
--   Preparation for the hearing
--   (1) After allocation the court will— (a) give standard directions...
--
-- in which the words "small claims" do not appear ANYWHERE. They are in the
-- title of Part 27, THE SMALL CLAIMS TRACK, and nowhere else in the provision.
-- A litigant asking how to prepare for a small claims hearing was therefore
-- served r.65.18 and r.55.36 — "The hearing" in the anti-social behaviour and
-- possession Parts — ahead of the rule that actually answers them.
--
-- Note this is NOT a heading-collision problem, which was the first guess.
-- Collisions are commoner in the statutes: 56.7% of Consumer Rights Act 2015
-- provisions share a heading with another, and 52.2% of Housing Act 1988, both
-- against 23.6% for the CPR. The difference is that the Act title resolves the
-- collision and "The Civil Procedure Rules 1998" cannot.
--
-- THE FIX. Store the enclosing Part or Chapter and put it in the embedding text
-- between the citation and the heading, so the text reads outermost context
-- first. The parser already extracted this — enumerateProvisions has tracked
-- partLabel all along, but composeHeading used it only for schedule paragraphs,
-- where the Part is what makes "paragraph 1" identifiable. Body provisions
-- discarded it. This column carries it for everything, and embedRows decides
-- where it is warranted.
--
-- SCOPE. Procedure rules only. Statute embedding text does not change, so the
-- statute cases in the eval can only move if a competing rule moves, and the
-- comparison against the pre-rules baseline stays meaningful. Applying this
-- corpus-wide is a defensible later step, but it would re-embed all 9,905 rows
-- and shift every statute case at once, so it needs measuring on its own.
--
-- MEASURED, offline against the real competing rules before building this:
--
--   small-claims-hearing      CPR r.27.4   #7  -> #1
--   starting-a-civil-claim    CPR r.7.2    #11 -> #10
--   child-arrangements-order  CA s.8       #6  -> #6
--   child-financial-provision CA Sch1 p1   #1  -> #1
--
-- One case decisively fixed; the others unchanged. An earlier run of the same
-- experiment appeared to fix all four, but its Part-title extractor truncated
-- long titles and injected raw XML into the competitors' text, which depressed
-- their scores for reasons that had nothing to do with the Part. The numbers
-- above are from the corrected run. The three residuals are accepted and
-- documented in scripts/eval/eval-set.ts rather than tuned away.

alter table public.legal_provisions
  add column if not exists part_label text;

comment on column public.legal_provisions.part_label is
  'Enclosing Part or Chapter, e.g. "PART 27 (THE SMALL CLAIMS TRACK)". Null '
  'where the provision sits directly under the body. Already folded into '
  'heading for schedule paragraphs; carried here for body provisions, where '
  'procedure rules need it as their only statement of subject matter.';

-- The embedding text changes for every rule, so their content hashes change and
-- the embed script re-embeds exactly those rows. Nothing else is touched.
notify pgrst, 'reload schema';

-- ===========================================================================
-- VERIFICATION
--
-- (1) and (2) run now. (3) and (4) only make sense after the re-ingest.
-- ===========================================================================

-- (1) The column exists and PostgREST can see it.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'legal_provisions'
  and column_name = 'part_label';

-- (2) Nothing was rewritten by the ALTER. Expect every row null, and the total
--     to match the 10,498 provisions already there.
select count(*) as total, count(part_label) as with_part_label
from public.legal_provisions;

-- (3) AFTER re-ingesting the two SIs: the rules that were failing now carry
--     their Part. Expect PART 27 (THE SMALL CLAIMS TRACK) for the 27.x rules
--     and PART 7 (HOW TO START PROCEEDINGS—THE CLAIM FORM) for the 7.x rules.
select p.ref, p.heading, p.part_label
from public.legal_provisions p
join public.legal_instruments i on i.id = p.instrument_id
where i.leg_gov_ref = 'uksi/1998/3132'
  and p.ref in ('rule/7.2', 'rule/7.5', 'rule/27.4', 'rule/27.8', 'rule/55.3', 'rule/65.18')
order by p.ref;

-- (4) AFTER re-ingesting: coverage. Rules sit inside Parts almost without
--     exception, so a large null count here means the parse lost the context
--     rather than that the rules genuinely have none.
select
  i.title,
  count(*) filter (where p.ref like 'rule/%') as rules,
  count(part_label) filter (where p.ref like 'rule/%') as rules_with_part,
  count(*) filter (where p.ref like 'section/%') as sections,
  count(part_label) filter (where p.ref like 'section/%') as sections_with_part
from public.legal_provisions p
join public.legal_instruments i on i.id = p.instrument_id
where i.leg_gov_ref in ('uksi/1998/3132', 'uksi/2010/2955')
group by i.title;
