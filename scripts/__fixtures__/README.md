# CLML test fixtures

Real `data.xml` responses from legislation.gov.uk, saved so the CLML parser
tests (`tests/clml.test.ts`) run hermetically with no network access.

| File | Source |
|---|---|
| `ukpga-1989-41-section-1.data.xml` | https://www.legislation.gov.uk/ukpga/1989/41/section/1/data.xml |
| `ukpga-1989-41-section-8.data.xml` | https://www.legislation.gov.uk/ukpga/1989/41/section/8/data.xml |
| `ukpga-1973-18-section-25.data.xml` | https://www.legislation.gov.uk/ukpga/1973/18/section/25/data.xml |
| `ukpga-1989-41-trimmed.data.xml` | https://www.legislation.gov.uk/ukpga/1989/41/data.xml (trimmed) |
| `uksi-2010-2955-trimmed.data.xml` | https://www.legislation.gov.uk/uksi/2010/2955/data.xml (trimmed) |
| `uksi-1998-3132-trimmed.data.xml` | https://www.legislation.gov.uk/uksi/1998/3132/data.xml (trimmed) |

Fetched 30 July 2026; the two procedure-rules files 6 August 2026. Content is
under the Open Government Licence v3.0.

## The trimmed whole-instrument files

The FPR and CPR responses are 4.6 MB and 14 MB, far too large to commit, so
each `-trimmed` file keeps the root element and `<ukm:Metadata>` verbatim and
carries only a few provisions:

- **FPR** — the whole of Part 1 (rules 1.1–1.5), plus rule 12.3. Part 1 covers
  every `Pnumber` shape the FPR uses: the split number
  (`<Pnumber PuncAfter=".1.">1</Pnumber>`, which must yield `1.1`, not `1`) and
  the amended rule whose number sits complete inside an `<Addition>`. Rule 12.3
  is the three-column table of proceedings, applicants and respondents, whose
  `<th>` header rendered `Proceedings forApplicantsRespondents` before table
  cells were delimited.
- **CPR** — rules 7.1, 7.2 and 6.26, plus the RSC schedule paragraph
  `schedule/5/paragraph/10`, whose `Pnumber` is bracketed
  (`PuncBefore="(" PuncAfter=")"`) rather than split. That is the case a naive
  `PuncAfter` join corrupts to `10)`. Rule 6.26 is the deemed-date-of-service
  table — two columns with multi-line cells, a different table shape from FPR
  r.12.3. Part 61's `<Number>` and `<Title>` come along because the schedule
  paragraph's heading is composed from them; rule 61.8 comes along because that
  paragraph shares its `P1group`.

Every provision in both files was checked to parse to exactly the same `number`,
`heading`, `content`, `extent`, `status` and `contentOmitted` as it does in the
full document — 0 differences out of 11. The trimming removes provisions; it
does not alter the ones that remain.

## One deliberate modification

These files are otherwise byte-identical to the API responses, with a single
exception:

**`key-<32 hex>` → `lgid-<32 hex>`** (183 occurrences, 58 distinct ids in the
Children Act files; 173/27 in the FPR file and 507/190 in the CPR file).

legislation.gov.uk uses that form for opaque internal identifiers on
`EffectId`, `ChangeId`, `CommentaryRef`, `id`, and effect `URI` attributes.
It is character-for-character the shape of a Mailgun API key, so GitHub's
push protection blocks the push as a suspected secret. It is a false
positive — these are public identifiers in Open Government Licence data —
but renaming the prefix is cleaner than allow-listing a "secret" in the repo.

Only the prefix changed, so every id remains unique and distinguishable.

**This does not weaken the tests.** The parser reads only:
`RequiresApplied`, `Type`, `AffectedProvisions`, `AffectingURI`,
`<ukm:Section>`'s `FoundRef`/`Ref`, and `<ukm:AffectingTitle>`. None of those
ever carries a `key-` value — verified: there are zero
`<ukm:Section Ref="key-…">` in these files, and `AffectingURI` never contains
one. `CommentaryRef` elements are stripped during text extraction anyway.

## Refreshing

Re-download with the URLs above, then re-apply the rename:

```bash
perl -pi -e 's/\bkey-([0-9a-f]{32})/lgid-$1/g' scripts/__fixtures__/*.xml
```

Expect currency values to drift as legislation is amended — the tests assert
specific dates and flags, so update them together and treat any change in
`has_unapplied_amendments` as a finding worth reading, not just a test to fix.
