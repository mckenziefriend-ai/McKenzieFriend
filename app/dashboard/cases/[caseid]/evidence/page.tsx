import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell, ToolPlaceholder } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function EvidencePage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).single();
  if (!caseRow) redirect("/dashboard/cases");

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Evidence">
      <ToolPlaceholder
        title="Evidence manager"
        description="Turn uploaded documents and facts into a proper evidence structure with references, links to events, and an evidence index for export or bundle building."
        bullets={["Evidence references E1, E2, E3", "Link evidence to chronology", "AI suggests missing links", "Generate evidence index"]}
      />
    </CaseWorkspaceShell>
  );
}
