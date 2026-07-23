import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/apiError";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

type ActionRequest = {
  caseId: string;
  action: {
    type: "create_chronology_event" | "create_calendar_item" | "create_bundle_item" | "create_statement";
    payload: Record<string, any>;
  };
};

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ActionRequest;
    const { caseId, action } = body;

    if (!caseId || !action?.type) {
      return NextResponse.json({ error: "Missing action." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const rate = checkRateLimit(`actions:${user.id}`, 60, 5 * 60 * 1000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

    const { data: caseRow } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .single();

    if (!caseRow) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    const payload = action.payload || {};

    if (action.type === "create_chronology_event") {
      const summary = clean(payload.summary);
      if (!summary) return NextResponse.json({ error: "Summary is required." }, { status: 400 });

      const { error } = await supabase.from("case_events").insert({
        case_id: caseId,
        date_unknown: Boolean(payload.date_unknown || !payload.event_date),
        event_date: payload.date_unknown || !payload.event_date ? null : clean(payload.event_date),
        summary,
        evidence: clean(payload.evidence),
      });

      if (error) throw error;
      return NextResponse.json({ message: "Added to chronology." });
    }

    if (action.type === "create_calendar_item") {
      const title = clean(payload.title);
      if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

      const { error } = await supabase.from("case_calendar_items").insert({
        case_id: caseId,
        user_id: user.id,
        title,
        item_type: clean(payload.item_type) || "Other",
        starts_at: clean(payload.starts_at),
        notes: clean(payload.notes),
      });

      if (error) throw error;
      return NextResponse.json({ message: "Added to calendar." });
    }

    if (action.type === "create_bundle_item") {
      const title = clean(payload.title);
      if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

      const { count } = await supabase
        .from("case_bundle_items")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseId);

      const { error } = await supabase.from("case_bundle_items").insert({
        case_id: caseId,
        user_id: user.id,
        title,
        section: clean(payload.section) || "General",
        item_type: clean(payload.item_type) || "Other",
        notes: clean(payload.notes),
        position: count ?? 0,
      });

      if (error) throw error;
      return NextResponse.json({ message: "Added to bundle." });
    }

    if (action.type === "create_statement") {
      const title = clean(payload.title);
      if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

      const { error } = await supabase.from("case_statements").insert({
        case_id: caseId,
        title,
        body: clean(payload.body) || "",
      });

      if (error) throw error;
      return NextResponse.json({ message: "Statement created." });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return apiError("Case action failed", error);
  }
}
