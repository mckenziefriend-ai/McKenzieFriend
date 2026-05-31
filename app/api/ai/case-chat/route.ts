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

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { answer: text, action: null };
  }
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

    const [eventsResult, statementsResult, documentsResult, calendarResult, bundleResult] = await Promise.all([
      supabase
        .from("case_events")
        .select("event_date,date_unknown,summary,evidence")
        .eq("case_id", caseId)
        .order("event_date", { ascending: true, nullsFirst: false })
        .limit(60),
      supabase
        .from("case_statements")
        .select("title,statement_by,body")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("case_documents")
        .select("file_name,category,summary,file_type,created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(35),
      supabase
        .from("case_calendar_items")
        .select("title,item_type,starts_at,notes")
        .eq("case_id", caseId)
        .order("starts_at", { ascending: true })
        .limit(30),
      supabase
        .from("case_bundle_items")
        .select("title,section,item_type,notes")
        .eq("case_id", caseId)
        .order("position", { ascending: true })
        .limit(60),
    ]);

    const events = eventsResult.error ? [] : ((eventsResult.data ?? []) as CaseEvent[]);
    const statements = statementsResult.error ? [] : ((statementsResult.data ?? []) as CaseStatement[]);
    const documents = documentsResult.error ? [] : ((documentsResult.data ?? []) as CaseDocument[]);
    const calendar = calendarResult.error ? [] : ((calendarResult.data ?? []) as CalendarItem[]);
    const bundle = bundleResult.error ? [] : ((bundleResult.data ?? []) as BundleItem[]);

    const eventText = events
      .map((event, index) => {
        const date = event.date_unknown || !event.event_date ? "Date unknown" : event.event_date;
        const evidence = event.evidence ? ` Evidence/reference: ${event.evidence}` : "";
        return `${index + 1}. ${date} — ${event.summary || "Untitled event"}.${evidence}`;
      })
      .join("\n");

    const statementText = statements
      .map((statement, index) => {
        const body = (statement.body || "").slice(0, 1200);
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

    const uploadedText = uploadedDocs.length
      ? `\n\nNew upload in this message:\n${uploadedDocs.map((doc, index) => `${index + 1}. ${doc.name} (${doc.category})`).join("\n")}`
      : "";

    const prompt = `
Current case:
Title: ${caseRow.title || "Untitled case"}
Court: ${caseRow.court_name || "Not added"}
Case number: ${caseRow.case_number || "Not added"}
Next hearing: ${caseRow.hearing_datetime || "Not added"}

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

User message:
${message}
`;

    const userContent: any = imageInputs.length
      ? [{ type: "text", text: prompt }, ...imageInputs]
      : prompt;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are McKenzie Friend AI for civil and family case preparation in England and Wales.

Stay within the McKenzie Friend role. You may provide moral support, help with case papers, take a note-taking/organising approach, help draft wording, help organise documents, chronologies, statements, calendars and bundles, explain procedural language cautiously, and translate text.

Do not act as a solicitor or barrister. Do not claim to represent the user. Do not say you can sign, file, send or serve documents for the user. Do not conduct litigation. Do not address the court, make oral submissions or examine witnesses. Do not give definitive legal advice or guarantee outcomes. If the user needs representation, rights of audience, conduct of litigation, formal legal advice or certified translation, say they may need a qualified professional or court permission as appropriate.

Be concise and adult. Do not over-explain. Do not invent facts, dates, documents, laws or outcomes. Use only the case material provided unless the user asks a general question. Reply in the user's language unless they ask otherwise.

Return JSON only in this shape:
{
  "answer": "short useful answer",
  "action": null or {
    "type": "create_chronology_event" | "create_calendar_item" | "create_bundle_item" | "create_statement",
    "label": "button label",
    "payload": { }
  }
}

Only include an action when the user asks you to add/create/make an entry or when there is a clear single proposed entry. The action is only a proposal and the user must confirm it.

Payload rules:
create_chronology_event: {"event_date":"YYYY-MM-DD" or null,"date_unknown":boolean,"summary":"...","evidence":"..." or null}
create_calendar_item: {"title":"...","item_type":"Hearing"|"Deadline"|"Appointment"|"Reminder"|"Other","starts_at":"YYYY-MM-DDTHH:mm" or null,"notes":"..." or null}
create_bundle_item: {"title":"...","section":"A"|"B"|"C"|"D"|"E"|"General","item_type":"Document"|"Chronology"|"Statement"|"Evidence"|"Other","notes":"..." or null}
create_statement: {"title":"...","body":"..."}`,
        },
        { role: "user", content: userContent },
      ],
    });

    const parsed = safeJson(response.choices[0]?.message?.content ?? "{}");
    const answer = String(parsed.answer || "").trim() || "Done.";
    const action = parsed.action ?? null;

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
