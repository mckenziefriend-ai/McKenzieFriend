import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type EventPayload = {
  event_date: string | null;
  date_unknown: boolean | null;
  summary: string;
  evidence?: string | null;
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY on the server." },
        { status: 500 }
      );
    }

    const {
      event,
      witnessName,
      partyRole,
      applicationType,
    } = await req.json();

    if (!event || !event.summary) {
      return NextResponse.json(
        { error: "Event is required." },
        { status: 400 }
      );
    }

    const ev = event as EventPayload;

    const prompt = `
Task:
Turn the event below into one short UK Family Court witness statement paragraph.

Rules:
- Write in first person.
- Keep it factual, restrained and neutral.
- Do not invent facts.
- Do not add allegations beyond the event.
- If the date is unknown, say "On an unknown date" only if needed.
- If evidence is mentioned, refer to it briefly only if it fits naturally.
- Return one paragraph only.
- No numbering.
- No heading.
- No commentary.

Witness context:
Name: ${witnessName || "Not provided"}
Party: ${partyRole || "Not provided"}
Application type: ${applicationType || "Not provided"}

Event:
Date: ${ev.date_unknown || !ev.event_date ? "Unknown date" : ev.event_date}
Summary: ${ev.summary}
Evidence: ${ev.evidence || "None provided"}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You convert individual chronology events into concise UK witness statement paragraphs without inventing facts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const paragraph = response.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ paragraph });
  } catch (error: any) {
    console.error("AI statement-event generation failed:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.error?.message ||
          "AI event paragraph generation failed.",
      },
      { status: error?.status || 500 }
    );
  }
}
