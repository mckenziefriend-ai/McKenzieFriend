import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import CourtAutocomplete from "@/app/dashboard/components/CourtAutocomplete";
import ExportHeaderFields from "@/app/dashboard/components/ExportHeaderFields";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  event_date: string | null;
  date_unknown: boolean | null;
  summary: string;
  evidence: string | null;
  created_at: string | null;
};

function formatDateUK(dateISO: string) {
  return new Date(dateISO).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function CaseChronologyPage({
  params,
}: {
  params: Promise<{ caseid: string }>;
}) {
  const { caseid: caseId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_private_beta")
    .eq("id", user.id)
    .single();
  if (!profile?.is_private_beta) redirect("/");

  const cookieStore = await cookies();
  const unlocked = cookieStore.get("chrono_unlocked")?.value === "1";
  if (!unlocked) redirect("/dashboard");

  const { data: caseRow } = await supabase
    .from("cases")
    .select(
      "id,title,created_at,court_name,court_slug,case_number,hearing_title,hearing_datetime,proceedings_heading,proceedings_lines"
    )
    .eq("id", caseId)
    .single();

  // ✅ list page is /dashboard/cases now
  if (!caseRow) redirect("/dashboard/cases");

  const { data: events } = await supabase
    .from("case_events")
    .select("id,event_date,date_unknown,summary,evidence,created_at")
    .eq("case_id", caseId);

  const rows = (events as EventRow[] | null) ?? [];

  const dated = rows
    .filter((r) => !r.date_unknown && r.event_date)
    .slice()
    .sort((a, b) => {
      if (a.event_date! < b.event_date!) return -1;
      if (a.event_date! > b.event_date!) return 1;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });

  const undated = rows
    .filter((r) => r.date_unknown || !r.event_date)
    .slice()
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));

  async function addEvent(formData: FormData) {
    "use server";

    const dateUnknown = String(formData.get("date_unknown") ?? "") === "on";
    const eventDateRaw = String(formData.get("event_date") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const evidence = String(formData.get("evidence") ?? "").trim();

    if (!summary) return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase.from("case_events").insert({
      case_id: caseId,
      date_unknown: dateUnknown,
      event_date: dateUnknown || !eventDateRaw ? null : eventDateRaw,
      summary,
      evidence: evidence ? evidence : null,
    });

    // ✅ come back to this page
    redirect(`/dashboard/cases/${caseId}/chronology`);
  }

  async function saveHeader(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const payload = {
      court_name: String(formData.get("court_name") ?? "").trim() || null,
      court_slug: String(formData.get("court_slug") ?? "").trim() || null,
      case_number: String(formData.get("case_number") ?? "").trim() || null,
      hearing_title: String(formData.get("hearing_title") ?? "").trim() || null,
      hearing_datetime:
        String(formData.get("hearing_datetime") ?? "").trim() || null,
      proceedings_heading:
        String(formData.get("proceedings_heading") ?? "").trim() || null,
      proceedings_lines:
        String(formData.get("proceedings_lines") ?? "").trim() || null,
    };

    await supabase.from("cases").update(payload).eq("id", caseId);

    redirect(`/dashboard/cases/${caseId}/chronology`);
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-zinc-600">
              CHRONOLOGY GENERATOR
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {caseRow.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Add events in date order. Keep wording factual and specific.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/cases/${caseId}/export`}
              className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
            >
              Export
            </Link>
            <Link
              href="/dashboard/cases"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Court heading / header fields */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-sm font-semibold text-zinc-900">Court heading</div>

          <form action={saveHeader} className="mt-6 grid gap-4">
            <ExportHeaderFields
              initial={{
                court_name: caseRow.court_name ?? "",
                court_slug: caseRow.court_slug ?? "",
                case_number: caseRow.case_number ?? "",
                hearing_title: caseRow.hearing_title ?? "",
                hearing_datetime: caseRow.hearing_datetime ?? "",
                proceedings_heading: caseRow.proceedings_heading ?? "",
                proceedings_lines: caseRow.proceedings_lines ?? "",
              }}
              CourtPicker={CourtAutocomplete}
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
              >
                Save heading
              </button>
            </div>
          </form>
        </div>

        {/* Add event */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-lg font-semibold text-zinc-900">Add an event</div>

          <form action={addEvent} className="mt-6 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Date
                </label>
                <input
                  name="event_date"
                  type="date"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    name="date_unknown"
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Date unknown
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                What happened
              </label>
              <textarea
                name="summary"
                placeholder="One or two sentences. Stick to facts."
                className="mt-1 min-h-[120px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Evidence (optional)
              </label>
              <input
                name="evidence"
                placeholder="e.g. WhatsApp messages, police ref, email from school"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
              >
                Add event
              </button>
            </div>
          </form>
        </div>

        {/* Dated events */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-zinc-900">Dated events</div>
            <div className="text-xs text-zinc-500">{dated.length} total</div>
          </div>

          <div className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
            {dated.length > 0 ? (
              dated.map((ev) => (
                <div key={ev.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-600">
                      {ev.event_date ? formatDateUK(ev.event_date) : ""}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900">
                      {ev.summary}
                    </div>
                    {ev.evidence ? (
                      <div className="mt-2 text-xs text-zinc-600">
                        <span className="font-semibold text-zinc-700">Evidence:</span>{" "}
                        {ev.evidence}
                      </div>
                    ) : null}
                  </div>

                  <Link
                    href={`/dashboard/cases/${caseId}/events/${ev.id}`}
                    className="shrink-0 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Edit
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-zinc-700">No dated events yet.</div>
            )}
          </div>
        </div>

        {/* Undated events */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-zinc-900">Undated events</div>
            <div className="text-xs text-zinc-500">{undated.length} total</div>
          </div>

          <div className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
            {undated.length > 0 ? (
              undated.map((ev) => (
                <div key={ev.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-600">Date unknown</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900">
                      {ev.summary}
                    </div>
                    {ev.evidence ? (
                      <div className="mt-2 text-xs text-zinc-600">
                        <span className="font-semibold text-zinc-700">Evidence:</span>{" "}
                        {ev.evidence}
                      </div>
                    ) : null}
                  </div>

                  <Link
                    href={`/dashboard/cases/${caseId}/events/${ev.id}`}
                    className="shrink-0 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Edit
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-zinc-700">No undated events yet.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
