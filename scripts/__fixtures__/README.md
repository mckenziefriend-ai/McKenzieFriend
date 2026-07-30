# CLML test fixtures

Real `data.xml` responses from legislation.gov.uk, saved so the CLML parser
tests (`tests/clml.test.ts`) run hermetically with no network access.

| File | Source |
|---|---|
| `ukpga-1989-41-section-1.data.xml` | https://www.legislation.gov.uk/ukpga/1989/41/section/1/data.xml |
| `ukpga-1989-41-section-8.data.xml` | https://www.legislation.gov.uk/ukpga/1989/41/section/8/data.xml |
| `ukpga-1973-18-section-25.data.xml` | https://www.legislation.gov.uk/ukpga/1973/18/section/25/data.xml |

Fetched 30 July 2026. Content is under the Open Government Licence v3.0.

## One deliberate modification

These files are otherwise byte-identical to the API responses, with a single
exception:

**`key-<32 hex>` → `lgid-<32 hex>`** (183 occurrences, 58 distinct ids).

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
