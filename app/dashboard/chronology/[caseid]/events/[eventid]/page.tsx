import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ caseid: string; eventid: string }>;
}) {
  const { caseid: caseId, eventid: eventId } = await params;

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
    .select("id,title")
    .eq("id", caseId)
    .single();
  if (!caseRow) redirect("/dashboard/chronology");

  const { data: ev } = await supabase
    .from("case_events")
    .select("id,case_id,event_date,date_unknown,summary,evidence")
    .eq("id", eventId)
    .eq("case_id", caseId)
    .single();

  if (!ev) redirect(`/dashboard/chronology/${caseId}`);

  async function saveEvent(formData: FormData) {
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

    await supabase
      .from("case_events")
      .update({
        date_unknown: dateUnknown,
        event_date: dateUnknown || !eventDateRaw ? null : eventDateRaw,
        summary,
        evidence: evidence ? evidence : null,
      })
      .eq("id", eventId)
      .eq("case_id", caseId);

    redirect(`/dashboard/chronology/${caseId}`);
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-zinc-600">EDIT EVENT</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {caseRow.title}
            </h1>
          </div>

          <Link
            href={`/dashboard/chronology/${caseId}`}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
          >
            Back
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <form action={saveEvent} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Date
                </label>
                <input
                  name="event_date"
                  type="date"
                  defaultValue={ev.event_date ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    name="date_unknown"
                    type="checkbox"
                    defaultChecked={!!ev.date_unknown}
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
                defaultValue={ev.summary ?? ""}
                className="mt-1 min-h-[120px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Evidence (optional)
              </label>
              <input
                name="evidence"
                defaultValue={ev.evidence ?? ""}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Link
                href={`/dashboard/chronology/${caseId}`}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
              >
                Save changes
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
