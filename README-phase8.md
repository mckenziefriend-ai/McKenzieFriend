# Phase 8: Chat action system

This phase fixes the chat action handling and adds chat controls.

Included:
- Prevent raw action JSON/payloads appearing in chat replies.
- Clear chat for the current case.
- Copy assistant replies.
- Translate assistant replies by asking for a target language.
- Adjust tone from an assistant reply.
- Statement action previews now include Copy draft and Download .txt.
- Action objects remain internal and render as preview cards.

No new SQL is required. Phase 5/7 chat tables are reused.
