import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MCKENZIE_FRIEND_SYSTEM_PROMPT, LEGAL_ANSWER_RULES } from "@/lib/ai/mckenzieFriendPrompt";
import { buildLegalContextForPrompt, getLegalContextForMessage } from "@/lib/legal/retrieval";
import { apiError } from "@/lib/apiError";
import { getOpenAI } from "@/lib/ai/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { type ProposedAction } from "@/lib/ai/actions";
import { safeJson, cleanVisibleAnswer, normaliseAction } from "@/lib/ai/parsing";

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
  action?: ProposedAction | null;
  created_at?: string | null;
};

type ImagePart = { type: "image_url"; image_url: { url: string } };
type TextPart = { type: "text"; text: string };

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
      files: formData.getAll("files").filter((file): file is File => file instanceof File),
    };
  }

  const body = await req.json();
  return {
    caseId: String(body?.caseId ?? ""),
    message: String(body?.message ?? ""),
    files: [] as File[],
  };
}

function toShortJson(action: ProposedAction) {
  if (!action?.type) return "";
  const payload = action.payload || {};
  const parts = Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 160)}`)
    .join("; ");
  return `${action.type}${parts ? ` (${parts})` : ""}`;
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

    const rate = checkRateLimit(`ai:${user.id}`, 20, 5 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id,title,case_number,court_name,hearing_datetime")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .single();

    if (caseError || !caseRow) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const uploadedDocs: { name: string; category: string; type: string | null }[] = [];
    const imageInputs: ImagePart[] = [];

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

    const [eventsResult, statementsResult, documentsResult, calendarResult, bundleResult, chatResult] = await Promise.all([
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
    ]);

    // Track which context queries failed rather than silently treating a
    // failed load as "no data". Drafting a statement from a partial case file
    // is more dangerous than a visible error, so we surface incompleteness to
    // the user (and refuse to draft) further down.
    const contextErrors: string[] = [];
    const noteError = (name: string, result: { error: unknown }) => {
      if (result.error) {
        console.error(`[case-chat] context query "${name}" failed:`, result.error);
        contextErrors.push(name);
        return true;
      }
      return false;
    };

    const events = noteError("chronology", eventsResult) ? [] : ((eventsResult.data ?? []) as CaseEvent[]);
    const statements = noteError("statements", statementsResult) ? [] : ((statementsResult.data ?? []) as CaseStatement[]);
    const documents = noteError("documents", documentsResult) ? [] : ((documentsResult.data ?? []) as CaseDocument[]);
    const calendar = noteError("calendar", calendarResult) ? [] : ((calendarResult.data ?? []) as CalendarItem[]);
    const bundle = noteError("bundle", bundleResult) ? [] : ((bundleResult.data ?? []) as BundleItem[]);
    const chatHistory = noteError("chat history", chatResult)
      ? []
      : ([...((chatResult.data ?? []) as ChatMessage[])].reverse());

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

    const legalChunks = await getLegalContextForMessage(message || userMessage);

    // Only relevance-matched sources are used, and the block is capped so a
    // long statute cannot crowd out the case context — role-boundary adherence
    // degrades in very long prompts, so the cap is a safety measure too.
    // When nothing matched, buildLegalContextForPrompt emits an explicit
    // "no sources" instruction rather than silence, so the model is told to say
    // it has no provision rather than answering from memory.
    const legalContext = buildLegalContextForPrompt(legalChunks);
    const legalSourceText = legalContext.text;

    if (legalChunks.length) {
      console.info(
        `[case-chat] legal sources: ${legalContext.used} used, ` +
          `${legalContext.dropped} dropped, ${legalContext.truncated} truncated, ` +
          `${legalContext.totalChars} chars`
      );
    }

    const uploadedText = uploadedDocs.length
      ? `\n\nNew upload in this message:\n${uploadedDocs.map((doc, index) => `${index + 1}. ${doc.name} (${doc.category})`).join("\n")}`
      : "";

    const contextWarning = contextErrors.length
      ? `IMPORTANT: The following parts of the case file could not be loaded this turn: ${contextErrors.join(", ")}. Treat those sections as UNKNOWN, not empty. Do not draft a witness statement or rely on the missing sections; tell the user those parts could not be loaded and to try again.\n\n`
      : "";

    const context = `${contextWarning}Current case:
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

Retrieved legal sources:
${legalSourceText}

Latest user message:
${message}
`;

    const userContent: string | (TextPart | ImagePart)[] = imageInputs.length
      ? [{ type: "text", text: context }, ...imageInputs]
      : context;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${MCKENZIE_FRIEND_SYSTEM_PROMPT}

${LEGAL_ANSWER_RULES}

Use the legal source context included in the current case context where relevant. Do not invent legal sources.

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
    let action = normaliseAction(parsed.action);
    let answer = cleanVisibleAnswer(parsed.answer) || "I can help with that.";

    // M9: don't let a statement be drafted from a partial case file, and never
    // hide from the user that context was incomplete.
    if (contextErrors.length) {
      const missing = contextErrors.join(", ");
      if (action?.type === "create_statement") {
        action = null;
        answer = `I couldn't load part of your case file (${missing} failed to load), so I haven't drafted a statement — a statement built from an incomplete file could leave out important facts. Please try again in a moment.`;
      } else {
        answer = `${answer}\n\n⚠️ I couldn't load part of your case file (${missing}) this time, so this reply may be based on incomplete information. Please retry if anything looks missing.`;
      }
    }

    await supabase.from("case_chat_messages").insert({
      case_id: caseId,
      user_id: user.id,
      role: "assistant",
      content: answer,
      action,
    });

    return NextResponse.json({ answer, action, uploaded: uploadedDocs, contextIncomplete: contextErrors.length > 0 });
  } catch (error) {
    return apiError("Case chat failed", error);
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
      .eq("user_id", user.id)
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
  } catch (error) {
    return apiError("Clear chat failed", error);
  }
}
