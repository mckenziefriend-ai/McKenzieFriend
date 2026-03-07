import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import StatementEditorClient from "./StatementEditorClient";

export const dynamic = "force-dynamic";

export default async function StatementEditorPage({
  params,
}: {
  params: Promise<{ caseid: string; statementid: string }>;
}) {
  const { caseid: caseId, statementid } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_private_beta")
    .eq("id", user.id)
    .single();
  if (!profile?.is_private_beta) redirect("/");

  const cookieStore = await cookies();
  const unlocked = cookieStore.get("chrono_unlocked")?.value === "1";
  if (!unlocked) redirect("/dashboard");

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id,title")
    .eq("id", caseId)
    .single();
  if (!caseRow) redirect("/dashboard/cases");

  const { data: st } = await supabase
    .from("case_statements")
    .select("id,case_id,title,statement_by,statement_date,body,updated_at")
    .eq("id", statementid)
    .eq("case_id", caseId)
    .single();

  if (!st) redirect(`/dashboard/cases/${caseId}/statements`);

  async function saveStatement(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const statementBy = String(formData.get("statement_by") ?? "").trim();
    const statementDateRaw = String(formData.get("statement_date") ?? "").trim();
    const body = String(formData.get("body") ?? "").trimEnd();

    if (!title) return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase
      .from("case_statements")
      .update({
        title,
        statement_by: statementBy ? statementBy : null,
        statement_date: statementDateRaw ? statementDateRaw : null,
        body,
      })
      .eq("id", statementid)
      .eq("case_id", caseId);

    redirect(`/dashboard/cases/${caseId}/statements/${statementid}`);
  }

  async function deleteStatement() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase
      .from("case_statements")
      .delete()
      .eq("id", statementid)
      .eq("case_id", caseId);

    redirect(`/dashboard/cases/${caseId}/statements`);
  }

  return (
    <StatementEditorClient
      caseId={caseId}
      statementid={statementid}
      caseTitle={caseRow.title}
      st={st}
      saveStatement={saveStatement}
      deleteStatement={deleteStatement}
    />
  );
}
