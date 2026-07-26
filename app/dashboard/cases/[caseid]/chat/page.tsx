import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";
import CaseChatClient, { type Message } from "@/app/dashboard/components/CaseChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).eq("user_id", user.id).single();
  if (!caseRow) redirect("/dashboard/cases");

  const { data: chatMessages } = await supabase
    .from("case_chat_messages")
    .select("role,content,action,created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .limit(80);

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Chat" assistant={false}>
      <CaseChatClient caseId={caseId} caseTitle={caseRow.title} initialMessages={(chatMessages as Message[] | null) ?? []} />
    </CaseWorkspaceShell>
  );
}
