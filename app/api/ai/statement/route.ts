import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { notes } = await req.json();

    const prompt = `
You are assisting someone writing a UK witness statement.

Rules:
- Do not invent facts.
- Only use the information provided.
- Write in first person.
- Use numbered paragraphs.
- Neutral factual tone.

User notes:
${notes}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      temperature: 0.2,
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

    return NextResponse.json({ draft });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }
}
