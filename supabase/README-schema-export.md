# Exporting the live schema to version control

The DDL for `cases`, `case_events` and `case_statements` (and all RLS
policies) exists only in the live Supabase project. It must be exported and
committed so the schema is reproducible. This requires the project owner's
credentials, so it cannot be automated from this repo.

One-time setup, from the repo root:

```bash
npm install --save-dev supabase
npx supabase login                       # opens browser, needs your access token
npx supabase init                        # creates supabase/config.toml
npx supabase link --project-ref <ref>    # <ref> from the project URL; asks for DB password
```

Then, to capture the full schema including RLS policies:

```bash
npx supabase db pull
```

This writes a timestamped migration file under `supabase/migrations/`.
Commit it. Re-run `npx supabase db pull` after any change made in the
Supabase dashboard so the repo stays the source of truth; longer term,
make schema changes as migrations (`npx supabase migration new ...`)
instead of editing the dashboard directly.

Verify the export includes, at minimum:

- `create table` statements for `cases`, `case_events`, `case_statements`
- `alter table ... enable row level security` for every case table
- Every `create policy` on those tables and on `storage.objects`
