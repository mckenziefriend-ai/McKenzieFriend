import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

const types = ["Hearing", "Deadline", "Appointment", "Reminder", "Other"];

type CalendarRow = {
  id: string;
  title: string;
  item_type: string | null;
  starts_at: string | null;
  notes: string | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CalendarPage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).eq("user_id", user.id).single();
  if (!caseRow) redirect("/dashboard/cases");

  const { data, error } = await supabase
    .from("case_calendar_items")
    .select("id,title,item_type,starts_at,notes,created_at")
    .eq("case_id", caseId)
    .order("starts_at", { ascending: true, nullsFirst: false });

  const items = error ? [] : ((data as CalendarRow[] | null) ?? []);

  async function addItem(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase.from("case_calendar_items").insert({
      case_id: caseId,
      user_id: user.id,
      title,
      item_type: String(formData.get("item_type") ?? "Other").trim() || "Other",
      starts_at: String(formData.get("starts_at") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    });

    redirect(`/dashboard/cases/${caseId}/calendar`);
  }

  async function deleteItem(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    await supabase.from("case_calendar_items").delete().eq("id", id).eq("case_id", caseId);
    redirect(`/dashboard/cases/${caseId}/calendar`);
  }

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Calendar">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-7">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <span className="text-sm text-slate-500">{items.length} entries</span>
        </div>

        {error ? (
          <div className="mb-5 border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Calendar is not set up yet. Run the Phase 5 Supabase SQL file.
          </div>
        ) : null}

        <form action={addItem} className="mb-6 grid gap-3 border-b border-slate-200 pb-6 lg:grid-cols-[1fr_160px_220px_auto] lg:items-start">
          <input name="title" placeholder="Title" required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20" />
          <select name="item_type" defaultValue="Hearing" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20">
            {types.map((type) => <option key={type}>{type}</option>)}
          </select>
          <input name="starts_at" type="datetime-local" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20" />
          <button className="rounded-lg bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10243A]">Add</button>
          <textarea name="notes" rows={2} placeholder="Notes" className="lg:col-span-4 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20" />
        </form>

        <div className="overflow-hidden border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_170px_120px_auto] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 max-md:hidden">
            <div>Entry</div><div>Date</div><div>Type</div><div></div>
          </div>
          {items.length ? (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_170px_120px_auto] md:items-start">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.title}</div>
                    {item.notes ? <div className="mt-1 text-sm text-slate-600">{item.notes}</div> : null}
                  </div>
                  <div className="text-sm text-slate-600">{formatDate(item.starts_at)}</div>
                  <div className="text-sm text-slate-600">{item.item_type || "Other"}</div>
                  <form action={deleteItem} className="md:text-right">
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-sm font-semibold text-red-700 hover:underline">Delete</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-sm text-slate-600">No calendar entries.</div>
          )}
        </div>
      </div>
    </CaseWorkspaceShell>
  );
}
