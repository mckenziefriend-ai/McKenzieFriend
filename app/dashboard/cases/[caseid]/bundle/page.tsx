import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function BundlePage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).single();
  if (!caseRow) redirect("/dashboard/cases");

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Bundle">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-7">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Bundle</h1>
          <button disabled className="rounded-lg bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white opacity-50">
            New bundle
          </button>
        </div>
        <div className="border border-slate-200 bg-white px-4 py-10 text-sm text-slate-600">
          No bundle started yet.
        </div>
      </div>
    </CaseWorkspaceShell>
  );
}
