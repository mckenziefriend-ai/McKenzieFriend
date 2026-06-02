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

type CalendarItem = {
  title: string | null;
  item_type: string | null;
  starts_at: string | null;
  notes: string | null;
};

type BundleItem = {
  title: string | null;
  section: string | null;
  item_type: string | null;
  notes: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string | null;
  action?: any;
  created_at?: string | null;
};

type LegalSource = {
  title: string | null;
  source_type: string | null;
  jurisdiction: string | null;
  content: string | null;
};

function safeJson(text: string) {
  const raw = String(text || "").trim();

  try {
    return JSON.parse(raw);
  } catch {}

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  const answerMatch = raw.match(/"answer"\s*:\s*"([\s\S]*?)"\s*,\s*"action"/);
  if (answerMatch?.[1]) {
    try {
      return { answer: JSON.parse(`"${answerMatch[1]}"`), action: null };
    } catch {
      return { answer: answerMatch[1], action: null };
    }
  }

  return { answer: raw, action: null };
}

function cleanVisibleAnswer(value: unknown) {
  let text = String(value || "").trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  const leakPatterns = [
    /,?\s*"action"\s*:\s*\{[\s\S]*$/i,
    /,?\s*action\s*:\s*\{[\s\S]*$/i,
    /,?\s*\{\s*"type"\s*:\s*"create_[\s\S]*$/i,
  ];

  for (const pattern of leakPatterns) {
    text = text.replace(pattern, "").trim();
  }

  text = text.replace(/^["']|["']$/g, "").trim();
  return text;
}

function cleanFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

async function getRequestData(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    return {
      caseId: String(formData.get("caseId") ?? ""),
      message: String(formData.get("message") ?? ""),
      files: formData.getAll("files").filter((file: any) => file && typeof file.arrayBuffer === "function") as any[],
    };
  }

  const body = await req.json();
  return {
    caseId: String(body?.caseId ?? ""),
    message: String(body?.message ?? ""),
    files: [] as any[],
  };
}

function toShortJson(action: any) {
  if (!action?.type) return "";
  const payload = action.payload || {};
  const parts = Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 160)}`)
    .join("; ");
  return `${action.type}${parts ? ` (${parts})` : ""}`;
}

function makeActionLabel(type: string) {
  if (type === "create_chronology_event") return "Add to chronology";
  if (type === "create_calendar_item") return "Add to calendar";
  if (type === "create_bundle_item") return "Add to bundle";
  if (type === "create_statement") return "Save to Statements";
  return "Save";
}

function normaliseAction(action: any) {
  if (!action || typeof action !== "object" || !action.type) return null;
  const allowed = ["create_chronology_event", "create_calendar_item", "create_bundle_item", "create_statement"];
  if (!allowed.includes(action.type)) return null;
  return {
    type: action.type,
    label: action.label || makeActionLabel(action.type),
    payload: action.payload || {},
  };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY on the server." }, { status: 500 });
    }

    const { caseId, message, files } = await getRequestData(req);

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required." }, { status: 400 });
    }

    if ((!message || !message.trim()) && files.length === 0) {
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

    const uploadedDocs: { name: string; category: string; type: string | null }[] = [];
    const imageInputs: any[] = [];

    for (const file of files.slice(0, 4)) {
      const fileName = String(file.name || "image");
      const fileType = String(file.type || "application/octet-stream");

      if (!fileType.startsWith("image/")) continue;
      if (Number(file.size || 0) > 8 * 1024 * 1024) {
        return NextResponse.json({ error: "Images must be under 8MB." }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const storagePath = `${user.id}/${caseId}/${Date.now()}-${cleanFileName(fileName)}`;

      const upload = await supabase.storage.from("case-documents").upload(storagePath, buffer, {
        contentType: fileType,
        upsert: false,
      });

      if (upload.error) throw upload.error;

      const summary = `Uploaded from chat: ${fileName}`;
      const insert = await supabase.from("case_documents").insert({
        case_id: caseId,
        user_id: user.id,
        file_name: fileName,
        storage_path: storagePath,
        file_type: fileType,
        file_size: Number(file.size || buffer.byteLength),
        category: "Screenshot",
        summary,
      });

      if (insert.error) throw insert.error;

      uploadedDocs.push({ name: fileName, category: "Screenshot", type: fileType });

      if (imageInputs.length < 2) {
        imageInputs.push({
          type: "image_url",
          image_url: { url: `data:${fileType};base64,${buffer.toString("base64")}` },
        });
      }
    }

    const userMessage = `${message.trim() || "Uploaded image"}${
      uploadedDocs.length ? `\n\nAttached: ${uploadedDocs.map((doc) => doc.name).join(", ")}` : ""
    }`;

    await supabase.from("case_chat_messages").insert({
      case_id: caseId,
      user_id: user.id,
      role: "user",
      content: userMessage,
    });

    const [eventsResult, statementsResult, documentsResult, calendarResult, bundleResult, chatResult, legalResult] = await Promise.all([
      supabase
        .from("case_events")
        .select("event_date,date_unknown,summary,evidence")
        .eq("case_id", caseId)
        .order("event_date", { ascending: true, nullsFirst: false })
        .limit(80),
      supabase
        .from("case_statements")
        .select("title,statement_by,body")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(14),
      supabase
        .from("case_documents")
        .select("file_name,category,summary,file_type,created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("case_calendar_items")
        .select("title,item_type,starts_at,notes")
        .eq("case_id", caseId)
        .order("starts_at", { ascending: true })
        .limit(40),
      supabase
        .from("case_bundle_items")
        .select("title,section,item_type,notes")
        .eq("case_id", caseId)
        .order("position", { ascending: true })
        .limit(80),
      supabase
        .from("case_chat_messages")
        .select("role,content,action,created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(16),
      supabase
        .from("legal_sources")
        .select("title,source_type,jurisdiction,content")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

    const events = eventsResult.error ? [] : ((eventsResult.data ?? []) as CaseEvent[]);
    const statements = statementsResult.error ? [] : ((statementsResult.data ?? []) as CaseStatement[]);
    const documents = documentsResult.error ? [] : ((documentsResult.data ?? []) as CaseDocument[]);
    const calendar = calendarResult.error ? [] : ((calendarResult.data ?? []) as CalendarItem[]);
    const bundle = bundleResult.error ? [] : ((bundleResult.data ?? []) as BundleItem[]);
    const chatHistory = chatResult.error ? [] : ([...((chatResult.data ?? []) as ChatMessage[])].reverse());
    const legalSources = legalResult.error ? [] : ((legalResult.data ?? []) as LegalSource[]);

    const eventText = events
      .map((event, index) => {
        const date = event.date_unknown || !event.event_date ? "Date unknown" : event.event_date;
        const evidence = event.evidence ? ` Evidence/reference: ${event.evidence}` : "";
        return `${index + 1}. ${date} — ${event.summary || "Untitled event"}.${evidence}`;
      })
      .join("\n");

    const statementText = statements
      .map((statement, index) => {
        const body = (statement.body || "").slice(0, 1800);
        return `${index + 1}. ${statement.title || "Untitled statement"}${statement.statement_by ? ` by ${statement.statement_by}` : ""}\n${body}`;
      })
      .join("\n\n");

    const documentText = documents
      .map((doc, index) => {
        const summary = doc.summary ? ` Summary: ${doc.summary}` : " No notes added.";
        return `${index + 1}. ${doc.file_name || "Untitled document"} (${doc.category || "Uncategorised"}).${summary}`;
      })
      .join("\n");

    const calendarText = calendar
      .map((item, index) => `${index + 1}. ${item.starts_at || "No date"} — ${item.title || "Untitled"} (${item.item_type || "Other"})${item.notes ? ` — ${item.notes}` : ""}`)
      .join("\n");

    const bundleText = bundle
      .map((item, index) => `${index + 1}. ${item.section || "General"} — ${item.title || "Untitled"} (${item.item_type || "Other"})${item.notes ? ` — ${item.notes}` : ""}`)
      .join("\n");

    const chatHistoryText = chatHistory
      .map((item) => {
        const action = item.action ? `\nProposed action: ${toShortJson(item.action)}` : "";
        return `${item.role === "user" ? "User" : "Assistant"}: ${(item.content || "").slice(0, 1400)}${action}`;
      })
      .join("\n\n");

    const legalSourceText = legalSources
      .map((source, index) => `${index + 1}. ${source.title || "Untitled source"} (${source.jurisdiction || "England and Wales"}, ${source.source_type || "Guidance"})\n${(source.content || "").slice(0, 3500)}`)
      .join("\n\n");

    const uploadedText = uploadedDocs.length
      ? `\n\nNew upload in this message:\n${uploadedDocs.map((doc, index) => `${index + 1}. ${doc.name} (${doc.category})`).join("\n")}`
      : "";

    const context = `
Current case:
Title: ${caseRow.title || "Untitled case"}
Court: ${caseRow.court_name || "Not added"}
Case number: ${caseRow.case_number || "Not added"}
Next hearing: ${caseRow.hearing_datetime || "Not added"}

Recent conversation:
${chatHistoryText || "No previous chat in this case."}

Chronology:
${eventText || "No chronology events added."}

Statements:
${statementText || "No statements added."}

Documents:
${documentText || "No documents uploaded or noted."}

Calendar:
${calendarText || "No calendar entries."}

Bundle:
${bundleText || "No bundle items."}
${uploadedText}

Legal role/source material available:
${legalSourceText || "No legal source material loaded yet. If answering legal/procedural points, be careful and say when the user may need to check the rules or get legal advice."}

Latest user message:
${message}
`;

    const userContent: any = imageInputs.length
      ? [{ type: "text", text: context }, ...imageInputs]
      : context;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are McKenzie Friend AI for litigants in person dealing with civil and family matters in England and Wales.

Your job is to act like a capable McKenzie Friend-style assistant: conversational, practical, careful and case-aware. You can have a normal focused conversation about the case without forcing every message into a form or tool. Work with incomplete information. Infer the user's likely task from the current message, recent chat and case context, but never invent facts.

Allowed role:
- Provide moral support.
- Help organise case papers.
- Help draft, improve and structure wording for the user to review.
- Help prepare chronologies, statements, bundles, document notes, calendars, questions and hearing notes.
- Explain procedure and legal language in plain English using England and Wales sources where available.
- Translate or simplify text.

Boundaries:
- Do not claim to be a solicitor, barrister or legal representative.
- Do not conduct litigation.
- Do not act as the user's agent.
- Do not say you can sign, file, send, serve or submit documents for the user.
- Do not address the court, make oral submissions or examine witnesses.
- Do not guarantee outcomes.
- If a request would cross the boundary, reframe it into something allowed, such as drafting wording for the user to review.

Conversation behaviour:
- Be natural and adult. No patronising tutorials.
- Short answers are fine. Longer answers only when the question needs it.
- If the user says "yes", "do that", "make it shorter", "change the title", or similar, use the recent conversation and pending proposed action to understand what they mean.
- Ask one short follow-up only when genuinely needed.
- If the user asks for a statement and there is enough chronology/document context, draft a preview. If not, ask what type of statement or what it should cover.
- If the user describes an incident/date/deadline, decide whether to reply conversationally or propose a chronology/calendar entry.
- Never say you have created or saved something unless an action has actually been confirmed and saved by the app. Before saving, show the proposed item in the answer and return an action object.

Return valid JSON only. Do not include markdown code fences. Do not put the action object inside the answer text. Return JSON only in this shape:
{
  "answer": "natural answer, including any proposed item preview if action is not null",
  "action": null or {
    "type": "create_chronology_event" | "create_calendar_item" | "create_bundle_item" | "create_statement",
    "label": "button label",
    "payload": { }
  }
}

Action rules:
- Only include an action when there is a clear proposed item the user can review and confirm.
- The answer must include a readable preview of the proposed item, not just a button.
- If facts are missing, use placeholders only where sensible and say what is missing.
- Do not silently create empty statements.

Payload rules:
create_chronology_event: {"event_date":"YYYY-MM-DD" or null,"date_unknown":boolean,"summary":"...","evidence":"..." or null}
create_calendar_item: {"title":"...","item_type":"Hearing"|"Deadline"|"Appointment"|"Reminder"|"Other","starts_at":"YYYY-MM-DDTHH:mm" or null,"notes":"..." or null}
create_bundle_item: {"title":"...","section":"A"|"B"|"C"|"D"|"E"|"General","item_type":"Document"|"Chronology"|"Statement"|"Evidence"|"Other","notes":"..." or null}
create_statement: {"title":"...","body":"draft text..."}`,
        },
        { role: "user", content: userContent },
      ],
    });

    const parsed = safeJson(response.choices[0]?.message?.content ?? "{}");
    const action = normaliseAction(parsed.action);
    const answer = cleanVisibleAnswer(parsed.answer) || "I can help with that.";

    await supabase.from("case_chat_messages").insert({
      case_id: caseId,
      user_id: user.id,
      role: "assistant",
      content: answer,
      action,
    });

    return NextResponse.json({ answer, action, uploaded: uploadedDocs });
  } catch (error: any) {
    console.error("Case chat failed:", error);
    return NextResponse.json(
      { error: error?.message || "The assistant could not respond." },
      { status: error?.status || 500 }
    );
  }
}


export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId") || "";

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const { data: caseRow } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .single();

    if (!caseRow) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const { error } = await supabase
      .from("case_chat_messages")
      .delete()
      .eq("case_id", caseId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ message: "Chat cleared." });
  } catch (error: any) {
    console.error("Clear chat failed:", error);
    return NextResponse.json({ error: error?.message || "Could not clear chat." }, { status: 500 });
  }
}
