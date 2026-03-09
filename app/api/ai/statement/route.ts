import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SelectedEvent = {
  id: string;
  event_date: string | null;
  date_unknown: boolean | null;
  summary: string;
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY on the server." },
        { status: 500 }
      );
    }

    const { notes, selectedEvents } = await req.json();

    if (
      (!notes || typeof notes !== "string") &&
      (!Array.isArray(selectedEvents) || selectedEvents.length === 0)
    ) {
      return NextResponse.json(
        { error: "Notes or selected chronology events are required." },
        { status: 400 }
      );
    }

    const eventsText = Array.isArray(selectedEvents)
  ? selectedEvents
      .map((ev: SelectedEvent, i: number) => {
        const dateLabel =
          ev.date_unknown || !ev.event_date ? "Date unknown" : ev.event_date;
        return `${i + 1}. ${dateLabel} — ${ev.summary}`;
      })
      .join("\n")
  : "";

const prompt = `
Task:
Draft a UK Family Court witness statement from the source material provided.

Output requirements:
- Write in first person.
- Use numbered paragraphs only.
- Keep a neutral, factual, non-argumentative tone.
- Use only facts contained in the source material.
- Do not invent, assume, infer, or fill gaps.
- Do not add legal advice, legal analysis, or case law.
- Do not exaggerate or use emotive language.
- Where dates or details are uncertain, say so only if the source material indicates uncertainty.
- Present events in chronological order where possible.
- Keep each paragraph short and focused on one point.
- Preserve the distinction between:
  - what I directly saw, heard, did, or received; and
  - what I was told by someone else.
- Do not include anything that is not supported by the source material.
- If the source material is too limited to support a formal witness statement, produce the fullest possible draft from the source material only.
- Use one numbered paragraph per incident where possible.
- Do not split a single incident into multiple paragraphs unless necessary.

Formatting requirements:
- Start directly with paragraph 1.
- No heading unless the source material provides one.
- No placeholders such as "[insert date]".
- No bullet points.
- No commentary before or after the statement.

My notes:
${notes || "None provided"}

Selected chronology events:
${eventsText || "None selected"}

Important:
- The selected chronology events are optional supporting source material chosen by the user.
- Use them where relevant.
- Do not force every selected event into the draft if it does not fit naturally.
`;
const response = await openai.chat.completions.create({
  model: "gpt-5-mini",
  messages: [
    {
      role: "system",
      content: `
You draft clear, restrained UK Family Court witness statements from user-provided notes.

You must:
- use only the facts given;
- never invent missing facts;
- never guess dates, names, sequences, or motives;
- write in first person;
- use numbered paragraphs;
- keep the tone calm, neutral, formal, legalistic and factual;
- avoid submissions, arguments, accusations, and legal advice;
- distinguish direct knowledge from second-hand information where the notes allow;
- omit anything unsupported by the notes.
      `,
    },
    {
      role: "user",
      content: prompt,
    },
  ],
});

    const draft = response.choices[0]?.message?.content ?? "";

    return NextResponse.json({
      draft,
      requestId: response._request_id ?? null,
    });
  } catch (error: any) {
    console.error("AI statement generation failed:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.error?.message ||
          "AI generation failed.",
        status: error?.status ?? null,
        type: error?.type ?? null,
        code: error?.code ?? null,
      },
      { status: error?.status || 500 }
    );
  }
}
