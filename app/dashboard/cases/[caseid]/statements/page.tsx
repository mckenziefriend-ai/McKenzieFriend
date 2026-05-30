import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

type StatementRow = {
  id: string;
  title: string;
  statement_by: string | null;
  statement_date: string | null;
  created_at: string | null;
};

function formatDateUK(dateISO: string) {
  return new Date(dateISO).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function StatementsListPage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).single();
  if (!caseRow) redirect("/dashboard/cases");

  const { data: statements } = await supabase
    .from("case_statements")
    .select("id,title,statement_by,statement_date,created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  const rows = (statements as StatementRow[] | null) ?? [];

  async function createStatement(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data, error } = await supabase
      .from("case_statements")
      .insert({ case_id: caseId, title, body: "" })
      .select("id")
      .single();

    if (error || !data?.id) redirect(`/dashboard/cases/${caseId}/statements`);
    redirect(`/dashboard/cases/${caseId}/statements/${data.id}`);
  }

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Statements">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-7">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Statements</h1>
          <span className="text-sm text-slate-500">{rows.length} total</span>
        </div>

        <form action={createStatement} className="mb-6 grid gap-3 border-b border-slate-200 pb-6 sm:grid-cols-[1fr_auto]">
          <input
            name="title"
            placeholder="Statement title"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20"
            required
          />
          <button type="submit" className="rounded-lg bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10243A]">
            Create
          </button>
        </form>

        <div className="overflow-hidden border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Title</div>
            <div>Action</div>
          </div>
          {rows.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {rows.map((s) => (
                <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {s.statement_by ? `By ${s.statement_by} • ` : ""}
                      {s.statement_date ? `Dated ${formatDateUK(s.statement_date)} • ` : ""}
                      {s.created_at ? `Created ${new Date(s.created_at).toLocaleString("en-GB")}` : ""}
                    </div>
                  </div>
                  <Link href={`/dashboard/cases/${caseId}/statements/${s.id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                    Open
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-sm text-slate-600">No statements yet.</div>
          )}
        </div>
      </div>
    </CaseWorkspaceShell>
  );
}
