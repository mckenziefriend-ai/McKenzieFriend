import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CaseEvent = {
  event_date: string | null;
  date_unknown: boolean | null;
  summary: string | null;
  evidence: string | null;
};

type CaseStatement = {
  title: string | null;
  statement_by: string | null;
  body: string | null;
};

type CaseDocument = {
  file_name: string | null;
  category: string | null;
  summary: string | null;
  file_type: string | null;
  created_at: string | null;
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY on the server." }, { status: 500 });
    }

    const { caseId, message } = await req.json();

    if (!caseId || typeof caseId !== "string") {
      return NextResponse.json({ error: "caseId is required." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id,title,case_number,court_name,hearing_datetime")
      .eq("id", caseId)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const [{ data: events }, { data: statements }, documentsResult] = await Promise.all([
      supabase
        .from("case_events")
        .select("event_date,date_unknown,summary,evidence")
        .eq("case_id", caseId)
        .order("event_date", { ascending: true, nullsFirst: false })
        .limit(40),
      supabase
        .from("case_statements")
        .select("title,statement_by,body")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("case_documents")
        .select("file_name,category,summary,file_type,created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    const safeDocuments = documentsResult.error ? [] : ((documentsResult.data ?? []) as CaseDocument[]);

    const eventText = ((events ?? []) as CaseEvent[])
      .map((event, index) => {
        const date = event.date_unknown || !event.event_date ? "Date unknown" : event.event_date;
        const evidence = event.evidence ? ` Evidence/reference: ${event.evidence}` : "";
        return `${index + 1}. ${date} — ${event.summary || "Untitled event"}.${evidence}`;
      })
      .join("\n");

    const statementText = ((statements ?? []) as CaseStatement[])
      .map((statement, index) => {
        const body = (statement.body || "").slice(0, 1200);
        return `${index + 1}. ${statement.title || "Untitled statement"}${statement.statement_by ? ` by ${statement.statement_by}` : ""}\n${body}`;
      })
      .join("\n\n");

    const documentText = safeDocuments
      .map((doc, index) => {
        const summary = doc.summary ? ` Summary: ${doc.summary}` : " No summary added yet.";
        return `${index + 1}. ${doc.file_name || "Untitled document"} (${doc.category || "Uncategorised"}).${summary}`;
      })
      .join("\n");

    const prompt = `
You are the case assistant inside McKenzie Friend AI.

User's current case:
Title: ${caseRow.title || "Untitled case"}
Court: ${caseRow.court_name || "Not added"}
Case number: ${caseRow.case_number || "Not added"}
Next hearing: ${caseRow.hearing_datetime || "Not added"}

Chronology events:
${eventText || "No chronology events added."}

Statements:
${statementText || "No statements added."}

Documents:
${documentText || "No documents uploaded or summarised."}

User message:
${message}

Instructions:
- Answer in the same language the user uses, unless they ask for a different language.
- Be direct and useful. Do not over-explain.
- Use only the case information provided above.
- If there is not enough information, say what is missing.
- Do not invent dates, facts, documents, legal outcomes, or court rules.
- You may help organise, summarise, translate, and draft wording.
- Do not present yourself as a solicitor and do not give definitive legal advice.
- For translations, say if an official/certified translation may be needed for court use.
- When suggesting changes to case data, describe what should be added rather than claiming you have already changed it.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a careful UK case preparation assistant. You help users organise case materials, documents, chronology entries, statements, translations and bundle preparation. You are concise, factual and cautious.",
        },
        { role: "user", content: prompt },
      ],
    });

    return NextResponse.json({ answer: response.choices[0]?.message?.content ?? "" });
  } catch (error: any) {
    console.error("Case chat failed:", error);
    return NextResponse.json(
      { error: error?.message || "The assistant could not respond." },
      { status: error?.status || 500 }
    );
  }
}
