# Phase 7: Conversational McKenzie Friend Brain

This update improves the case chat behaviour and adds a starter legal-source layer.

## Included

- Stronger McKenzie Friend role rules.
- England and Wales scope.
- Recent chat history included in the AI request.
- Better follow-up handling for replies like “yes”, “do that”, “make it shorter”, etc.
- Case context included from chronology, statements, documents, calendar and bundle.
- Starter legal source table for McKenzie Friend guidance.
- Full action previews before saving chronology, calendar, statement and bundle entries.
- Chat actions remain confirmation-based.

## Supabase

Run:

```sql
supabase/phase7_mckenzie_friend_brain_setup.sql
```

This creates `legal_sources` and seeds a starter McKenzie Friend role source.
