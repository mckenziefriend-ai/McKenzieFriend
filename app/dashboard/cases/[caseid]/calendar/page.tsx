import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell, ToolPlaceholder } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).single();
  if (!caseRow) redirect("/dashboard/cases");

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Calendar">
      <ToolPlaceholder
        title="Case calendar"
        description="Track hearings, statement deadlines, evidence deadlines, appointments and reminders. The AI should understand upcoming dates and help users prepare."
        bullets={["Court hearings", "Deadlines and reminders", "AI extracts dates from documents", "Link dates to documents/events"]}
      />
    </CaseWorkspaceShell>
  );
}
