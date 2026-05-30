import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell, ToolPlaceholder } from "@/app/dashboard/components/CaseWorkspaceShell";

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
      <ToolPlaceholder
        title="Bundle builder"
        description="Create a court-ready bundle from case summary, orders, chronology, statements, evidence and uploaded documents. The AI can suggest the structure and flag missing items."
        bullets={["Create bundle sections", "Add and order documents", "Generate an index", "Preview and export bundle PDF"]}
      />
    </CaseWorkspaceShell>
  );
}
