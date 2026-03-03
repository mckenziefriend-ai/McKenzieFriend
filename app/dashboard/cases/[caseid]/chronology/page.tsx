import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import CourtAutocomplete from "../components/CourtAutocomplete";

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

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default async function CasePage({
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

  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select(
      "id,title,created_at,court_name,court_slug,case_number,hearing_title,hearing_datetime,proceedings_heading,proceedings_lines,applicant,respondent,children_involved"
    )
    .eq("id", caseId)
    .single();

  // If this errors, don't silently bounce — bounce to list (keeps behaviour clean)
  if (caseErr || !caseRow) redirect("/dashboard/chronology");

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

  async function saveCourtHeading(formData: FormData) {
    "use server";

    const court_name = String(formData.get("court_name") ?? "").trim();
    const court_slug = String(formData.get("court_slug") ?? "").trim();
    const case_number = String(formData.get("case_number") ?? "").trim();

    const applicant = String(formData.get("applicant") ?? "").trim();
    const respondent = String(formData.get("respondent") ?? "").trim();

    const hearing_title = String(formData.get("hearing_title") ?? "").trim();
    const hearing_dt_raw = String(formData.get("hearing_datetime") ?? "").trim();
    const children_involved = String(formData.get("children_involved") ?? "").trim();

    const hearing_datetime =
      hearing_dt_raw.length > 0 ? fromDatetimeLocal(hearing_dt_raw) : null;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase
      .from("cases")
      .update({
        court_name: court_name || null,
        court_slug: court_slug || null,
        case_number: case_number || null,
        applicant: applicant || null,
        respondent: respondent || null,
        hearing_title: hearing_title || null,
        hearing_datetime,
        children_involved: children_involved || null,
      })
      .eq("id", caseId);

    redirect(`/dashboard/chronology/${caseId}`);
  }

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

    redirect(`/dashboard/chronology/${caseId}`);
  }

  async function deleteEvent(formData: FormData) {
    "use server";

    const eventId = String(formData.get("event_id") ?? "");
    if (!eventId) return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase.from("case_events").delete().eq("id", eventId);

    redirect(`/dashboard/chronology/${caseId}`);
  }

  async function deleteCase(formData: FormData) {
    "use server";

    const confirm = String(formData.get("confirm") ?? "").trim();
    if (confirm !== "DELETE") return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase.from("cases").delete().eq("id", caseId);

    redirect("/dashboard/chronology");
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
              href="/dashboard/chronology"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Court heading */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold">Court heading</h2>

          <form action={saveCourtHeading} className="mt-5 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CourtAutocomplete
                defaultName={caseRow.court_name ?? ""}
                defaultSlug={caseRow.court_slug ?? ""}
              />

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Case number
                </label>
                <input
                  name="case_number"
                  defaultValue={caseRow.case_number ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Applicant
                </label>
                <input
                  name="applicant"
                  defaultValue={(caseRow as any).applicant ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Respondent
                </label>
                <input
                  name="respondent"
                  defaultValue={(caseRow as any).respondent ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Hearing title
                </label>
                <input
                  name="hearing_title"
                  defaultValue={caseRow.hearing_title ?? ""}
                  placeholder="e.g. FHDRA"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Hearing date/time
                </label>
                <input
                  name="hearing_datetime"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(caseRow.hearing_datetime)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Children (optional)
              </label>
              <textarea
                name="children_involved"
                defaultValue={(caseRow as any).children_involved ?? ""}
                placeholder="Name (DOB) — one per line"
                className="mt-1 min-h-[90px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              />
            </div>

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
          <h2 className="text-lg font-semibold">Add an event</h2>

          <form action={addEvent} className="mt-4 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">Date</label>
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
                className="mt-1 min-h-[96px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
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

        {/* Events lists (unchanged) */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Dated events</h2>
            <span className="text-xs text-zinc-500">{dated.length} total</span>
          </div>

          {dated.length > 0 ? (
            <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {dated.map((ev) => (
                <div key={ev.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-600">
                        {formatDateUK(ev.event_date!)}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-zinc-900">
                        {ev.summary}
                      </div>
                      {ev.evidence ? (
                        <div className="mt-2 text-xs text-zinc-600">
                          <span className="font-semibold text-zinc-700">
                            Evidence:
                          </span>{" "}
                          {ev.evidence}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/chronology/${caseId}/events/${ev.id}`}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        Edit
                      </Link>

                      <form action={deleteEvent}>
                        <input type="hidden" name="event_id" value={ev.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              No dated events yet.
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Undated events</h2>
            <span className="text-xs text-zinc-500">{undated.length} total</span>
          </div>

          {undated.length > 0 ? (
            <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {undated.map((ev) => (
                <div key={ev.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-600">
                        Date unknown
                      </div>
                      <div className="mt-1 text-sm font-semibold text-zinc-900">
                        {ev.summary}
                      </div>
                      {ev.evidence ? (
                        <div className="mt-2 text-xs text-zinc-600">
                          <span className="font-semibold text-zinc-700">
                            Evidence:
                          </span>{" "}
                          {ev.evidence}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/chronology/${caseId}/events/${ev.id}`}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        Edit
                      </Link>

                      <form action={deleteEvent}>
                        <input type="hidden" name="event_id" value={ev.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              No undated events.
            </div>
          )}
        </div>

        {/* Export button near bottom */}
        <div className="mt-10 flex justify-end">
          <Link
            href={`/dashboard/chronology/${caseId}/export`}
            className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
          >
            Export / Print
          </Link>
        </div>

        {/* Danger zone */}
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 sm:p-8">
          <div className="text-sm font-semibold text-red-900">Delete this case</div>
          <div className="mt-1 text-sm text-red-800">
            This permanently deletes the case and all events. This cannot be undone.
          </div>

          <form action={deleteCase} className="mt-4 grid gap-3 sm:max-w-sm">
            <label className="text-xs font-semibold text-red-900">
              Type <span className="font-bold">DELETE</span> to confirm
            </label>
            <input
              name="confirm"
              className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-300"
              placeholder="DELETE"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Permanently delete case
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
