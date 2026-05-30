import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell, ToolPlaceholder } from "@/app/dashboard/components/CaseWorkspaceShell";

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
      <ToolPlaceholder
        title="Document storage"
        description="Upload and organise court orders, letters, screenshots, statements and evidence. The AI should be able to summarise documents and answer questions from them."
        bullets={["Upload documents", "Categorise files", "AI summaries", "Link documents to events/evidence"]}
      />
    </CaseWorkspaceShell>
  );
}
