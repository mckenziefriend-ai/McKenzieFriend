import OpenAI from "openai";

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
