import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY on the server." },
        { status: 500 }
      );
    }

    const { notes } = await req.json();

    if (!notes || typeof notes !== "string") {
      return NextResponse.json(
        { error: "Notes are required." },
        { status: 400 }
      );
    }

    const prompt = `
You are assisting someone writing a UK witness statement.

Rules:
- Do not invent facts.
- Only use the information provided.
- Write in first person.
- Use numbered paragraphs.
- Neutral factual tone.
- Do not add legal advice.
- If information is missing, leave it out rather than guessing.

User notes:
${notes}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You help draft UK witness statements clearly without inventing facts.",
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
