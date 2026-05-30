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
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Statements</h2>
          <form action={createStatement} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              name="title"
              placeholder="Statement title"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20"
              required
            />
            <button type="submit" className="rounded-xl bg-[#0B1A2B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10243A]">
              Create
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">Your statements</h3>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{rows.length} total</div>
          </div>

          <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {rows.length > 0 ? rows.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="font-semibold">{s.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {s.statement_by ? `By ${s.statement_by} • ` : ""}
                    {s.statement_date ? `Dated ${formatDateUK(s.statement_date)} • ` : ""}
                    {s.created_at ? `Created ${new Date(s.created_at).toLocaleString("en-GB")}` : ""}
                  </div>
                </div>
                <Link href={`/dashboard/cases/${caseId}/statements/${s.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  Open
                </Link>
              </div>
            )) : (
              <div className="p-4 text-sm text-slate-600">No statements yet.</div>
            )}
          </div>
        </section>
      </div>
    </CaseWorkspaceShell>
  );
}
