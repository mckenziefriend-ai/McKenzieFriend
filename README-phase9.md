# Phase 9 - Legal Intelligence Foundation

This phase adds the first real legal intelligence layer for McKenzie Friend AI.

Included:

- Stronger McKenzie Friend role/system prompt.
- Legal retrieval helper for legal source chunks.
- Supabase legal source/chunk tables.
- Full pasted Practice Guidance: McKenzie Friends (Civil and Family Courts) seeded as the first complete legal source.
- Searchable chunks covering paragraphs 1-31 of the guidance.
- Chat route now retrieves legal context and uses it when answering legal/procedure questions.
- Developer evaluation prompts for role boundaries, legal procedure, memory and tool actions.

Run this SQL in Supabase before testing:

```txt
supabase/phase9_legal_intelligence_setup.sql
```

This phase does not yet add the full FPR/CPR library. It creates the foundation for adding those sources next.
