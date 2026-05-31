import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";
import PrintButton from "@/app/dashboard/components/PrintButton";

export const dynamic = "force-dynamic";

const sections = ["A", "B", "C", "D", "E", "General"];
const itemTypes = ["Document", "Chronology", "Statement", "Evidence", "Other"];

type BundleItem = {
  id: string;
  section: string | null;
  title: string;
  item_type: string | null;
  notes: string | null;
  position: number | null;
};

type DocRow = { id: string; file_name: string; category: string | null };
type StatementRow = { id: string; title: string };

export default async function BundlePage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).single();
  if (!caseRow) redirect("/dashboard/cases");

  const [itemsResult, docsResult, statementsResult, eventsResult] = await Promise.all([
    supabase.from("case_bundle_items").select("id,section,title,item_type,notes,position").eq("case_id", caseId).order("position", { ascending: true }),
    supabase.from("case_documents").select("id,file_name,category").eq("case_id", caseId).order("created_at", { ascending: false }),
    supabase.from("case_statements").select("id,title").eq("case_id", caseId).order("created_at", { ascending: false }),
    supabase.from("case_events").select("id").eq("case_id", caseId).limit(1),
  ]);

  const items = itemsResult.error ? [] : ((itemsResult.data as BundleItem[] | null) ?? []);
  const docs = docsResult.error ? [] : ((docsResult.data as DocRow[] | null) ?? []);
  const statements = statementsResult.error ? [] : ((statementsResult.data as StatementRow[] | null) ?? []);
  const hasChronology = !eventsResult.error && (eventsResult.data?.length ?? 0) > 0;

  async function addManualItem(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { count } = await supabase.from("case_bundle_items").select("id", { count: "exact", head: true }).eq("case_id", caseId);
    await supabase.from("case_bundle_items").insert({
      case_id: caseId,
      user_id: user.id,
      title,
      section: String(formData.get("section") ?? "General").trim() || "General",
      item_type: String(formData.get("item_type") ?? "Other").trim() || "Other",
      notes: String(formData.get("notes") ?? "").trim() || null,
      position: count ?? 0,
    });
    redirect(`/dashboard/cases/${caseId}/bundle`);
  }

  async function addExistingItem(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { count } = await supabase.from("case_bundle_items").select("id", { count: "exact", head: true }).eq("case_id", caseId);
    await supabase.from("case_bundle_items").insert({
      case_id: caseId,
      user_id: user.id,
      title,
      section: String(formData.get("section") ?? "General").trim() || "General",
      item_type: String(formData.get("item_type") ?? "Other").trim() || "Other",
      notes: String(formData.get("notes") ?? "").trim() || null,
      position: count ?? 0,
    });
    redirect(`/dashboard/cases/${caseId}/bundle`);
  }

  async function deleteItem(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    await supabase.from("case_bundle_items").delete().eq("id", id).eq("case_id", caseId);
    redirect(`/dashboard/cases/${caseId}/bundle`);
  }

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Bundle">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-7">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Bundle</h1>
          <PrintButton />
        </div>

        {itemsResult.error ? (
          <div className="mb-5 border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Bundle is not set up yet. Run the Phase 5 Supabase SQL file.
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 border-b border-slate-200 pb-6 lg:grid-cols-2">
          <form action={addManualItem} className="grid gap-3">
            <div className="text-sm font-semibold">Add item</div>
            <input name="title" placeholder="Title" required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="section" defaultValue="General" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                {sections.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select name="item_type" defaultValue="Document" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                {itemTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <textarea name="notes" rows={2} placeholder="Notes" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" />
            <button className="w-fit rounded-lg bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white">Add</button>
          </form>

          <div className="grid gap-3">
            <div className="text-sm font-semibold">Add from case</div>
            {hasChronology ? (
              <form action={addExistingItem}>
                <input type="hidden" name="title" value="Chronology" />
                <input type="hidden" name="section" value="C" />
                <input type="hidden" name="item_type" value="Chronology" />
                <button className="text-sm font-semibold text-[#0B1A2B] hover:underline">Add chronology</button>
              </form>
            ) : null}
            {statements.map((statement) => (
              <form key={statement.id} action={addExistingItem}>
                <input type="hidden" name="title" value={statement.title} />
                <input type="hidden" name="section" value="D" />
                <input type="hidden" name="item_type" value="Statement" />
                <button className="text-sm font-semibold text-[#0B1A2B] hover:underline">Add statement: {statement.title}</button>
              </form>
            ))}
            {docs.map((doc) => (
              <form key={doc.id} action={addExistingItem}>
                <input type="hidden" name="title" value={doc.file_name} />
                <input type="hidden" name="section" value={doc.category === "Court order" ? "B" : "E"} />
                <input type="hidden" name="item_type" value={doc.category === "Evidence" ? "Evidence" : "Document"} />
                <input type="hidden" name="notes" value={doc.category || ""} />
                <button className="text-sm font-semibold text-[#0B1A2B] hover:underline">Add document: {doc.file_name}</button>
              </form>
            ))}
            {!hasChronology && !statements.length && !docs.length ? <div className="text-sm text-slate-600">Nothing available yet.</div> : null}
          </div>
        </div>

        <div className="overflow-hidden border border-slate-200 bg-white print:border-0">
          <div className="grid grid-cols-[80px_minmax(0,1fr)_130px_auto] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 max-md:hidden print:grid">
            <div>Section</div><div>Item</div><div>Type</div><div></div>
          </div>
          {items.length ? (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="grid gap-3 px-4 py-4 md:grid-cols-[80px_minmax(0,1fr)_130px_auto] md:items-start print:grid-cols-[80px_minmax(0,1fr)_130px]">
                  <div className="text-sm font-semibold">{item.section || "General"}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.title}</div>
                    {item.notes ? <div className="mt-1 text-sm text-slate-600">{item.notes}</div> : null}
                  </div>
                  <div className="text-sm text-slate-600">{item.item_type || "Other"}</div>
                  <form action={deleteItem} className="print:hidden md:text-right">
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-sm font-semibold text-red-700 hover:underline">Delete</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-sm text-slate-600">No bundle items.</div>
          )}
        </div>
      </div>
    </CaseWorkspaceShell>
  );
}
