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

    const body = await req.json();
    const mode = body?.mode;

    if (mode === "rewrite") {
      const selectedText = String(body?.selectedText ?? "").trim();
      const rewriteMode = String(body?.rewriteMode ?? "court");

      if (!selectedText) {
        return NextResponse.json(
          { error: "No selected text provided." },
          { status: 400 }
        );
      }

      const rewriteInstructionMap: Record<string, string> = {
        court:
          "Rewrite this in restrained, court-appropriate UK witness statement language. Keep the meaning the same.",
        factual:
          "Rewrite this to be more factual, neutral, and less emotive. Keep the meaning the same.",
        shorten:
          "Rewrite this more concisely while preserving the meaning.",
        clarify:
          "Rewrite this more clearly and precisely while preserving the meaning.",
      };

      const instruction =
        rewriteInstructionMap[rewriteMode] ?? rewriteInstructionMap.court;

      const prompt = `
Task:
${instruction}

Rules:
- Do not invent facts.
- Do not add legal advice.
- Do not change the meaning.
- Keep it in first person if the original is in first person.
- Return only the rewritten text.
- No commentary or explanation.

Text:
${selectedText}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You rewrite small sections of UK witness statements without inventing facts or changing meaning.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const rewritten = response.choices[0]?.message?.content?.trim() ?? "";

      return NextResponse.json({ rewritten });
    }

    if (mode === "review") {
      const statementText = String(body?.statementText ?? "").trim();

      if (!statementText) {
        return NextResponse.json(
          { error: "No statement text provided." },
          { status: 400 }
        );
      }

      const prompt = `
Task:
Review this draft UK witness statement and identify drafting issues.

Rules:
- Do not rewrite the whole statement.
- Do not invent facts.
- Do not give legal advice.
- Focus only on drafting quality and clarity.
- Return concise practical feedback.

Check for:
- unclear or missing dates/details
- emotional or argumentative wording
- repeated points
- vague references to evidence
- places where who/when/where is unclear
- places that sound unsupported or too absolute
- overall structure issues

Return JSON in this exact shape:
{
  "issues": [
    {
      "type": "clarity | tone | repetition | evidence | unsupported | structure",
      "quote": "short quoted extract or summary",
      "message": "what the issue is",
      "suggestion": "brief fix suggestion"
    }
  ],
  "summary": "short overall summary"
}

Statement:
${statementText}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content:
              "You review draft UK witness statements for clarity, tone, and drafting issues only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? "";

      try {
        const parsed = JSON.parse(raw);
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({
          issues: [],
          summary: raw || "No review output returned.",
        });
      }
    }

    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  } catch (error: any) {
    console.error("AI statement tools failed:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          error?.error?.message ||
          "AI tool request failed.",
      },
      { status: error?.status || 500 }
    );
  }
}
