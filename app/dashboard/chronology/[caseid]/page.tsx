import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type EventRow = {
  id: string;
  event_date: string | null;
  date_unknown: boolean | null;
  summary: string;
  evidence: string | null;
  created_at: string | null;
};

export default async function CasePage({
  params,
}: {
  params: Record<string, string>;
}) {
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

  // ✅ works whether your folder is [caseid] or [caseId]
  const caseId = params.caseid ?? params.caseId;
  if (!caseId) redirect("/dashboard/chronology");

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id,title,created_at")
    .eq("id", caseId)
    .single();
  if (!caseRow) redirect("/dashboard/chronology");

  const { data: events } = await supabase
    .from("case_events")
    .select("id,event_date,date_unknown,summary,evidence,created_at")
    .eq("case_id", caseId);

  const sortedEvents =
    (events as EventRow[] | null)?.slice().sort((a, b) => {
      const au = !!a.date_unknown || !a.event_date;
      const bu = !!b.date_unknown || !b.event_date;
      if (au !== bu) return au ? 1 : -1;

      if (a.event_date && b.event_date) {
        if (a.event_date < b.event_date) return -1;
        if (a.event_date > b.event_date) return 1;
      }

      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    }) ?? [];

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

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {caseRow.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Add events. Keep entries factual and short.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/chronology/${caseId}/export`}
              className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
            >
              Export
            </Link>

            <Link
              href="/dashboard/chronology"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Add event */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold">Add an event</h2>

          <form action={addEvent} className="mt-4 grid gap-4">
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

        {/* Events list */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Events</h2>
            <span className="text-xs text-zinc-500">
              {sortedEvents.length} total
            </span>
          </div>

          {sortedEvents.length > 0 ? (
            <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {sortedEvents.map((ev) => (
                <div key={ev.id} className="bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-600">
                        {ev.date_unknown || !ev.event_date
                          ? "Date unknown"
                          : new Date(ev.event_date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
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
              No events yet. Add your first event above.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
