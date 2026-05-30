import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).single();
  if (!caseRow) redirect("/dashboard/cases");

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Documents">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
            <p className="mt-1 text-sm text-slate-600">Upload and organise case documents here.</p>
          </div>
          <button disabled className="rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white opacity-60">
            Coming soon
          </button>
        </div>
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-[#F7F9FB] p-8 text-center text-sm text-slate-600">
          No documents added yet.
        </div>
      </section>
    </CaseWorkspaceShell>
  );
}
