import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";
import CaseChatClient from "@/app/dashboard/components/CaseChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).single();
  if (!caseRow) redirect("/dashboard/cases");

  const { data: chatMessages } = await supabase
    .from("case_chat_messages")
    .select("role,content,action,created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .limit(80);

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="McKenzie Friend AI" assistant={false}>
      <CaseChatClient caseId={caseId} initialMessages={(chatMessages as any) ?? []} />
    </CaseWorkspaceShell>
  );
}
