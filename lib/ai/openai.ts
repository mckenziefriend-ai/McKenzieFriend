import OpenAI from "openai";

// NOTE ON TEMPERATURE: the gpt-5 family (incl. gpt-5-mini used here) only
// supports the default temperature of 1 and returns a 400 if any other value
// is passed. So we deliberately do NOT set `temperature` on any call — the
// review's request for low/deterministic sampling cannot be honoured on this
// model. Do not add `temperature` back without switching models first.

let client: OpenAI | null = null;

// Constructed lazily so importing a route module never throws during
// next build's page-data collection when OPENAI_API_KEY is absent.
// Handlers must guard on process.env.OPENAI_API_KEY before calling this.
export function getOpenAI() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
