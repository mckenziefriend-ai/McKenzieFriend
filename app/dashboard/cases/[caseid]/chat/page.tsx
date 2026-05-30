import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: caseRow } = await supabase.from("cases").select("id,title").eq("id", caseId).single();
  if (!caseRow) redirect("/dashboard/cases");

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Chat" assistant={false}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1F344D] dark:bg-[#0B1A2B] sm:p-8">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2B7C86] dark:text-[#88D2DC]">AI case assistant</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Chat with your case</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            This is the full-screen chat workspace. The assistant should answer questions, draft wording, translate, check missing information and work with the tools in this case.
          </p>

          <div className="mt-8 space-y-4">
            <div className="max-w-[85%] rounded-3xl bg-[#F6F8FA] p-4 text-sm text-slate-700 dark:bg-[#10243A] dark:text-slate-200">
              Ask me anything about this case. I will be able to use your chronology, statements, documents, evidence, calendar and bundle.
            </div>
            <div className="ml-auto max-w-[85%] rounded-3xl bg-[#0B1A2B] p-4 text-sm text-white dark:bg-[#88D2DC] dark:text-[#07111F]">
              What should I do next?
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-[#F6F8FA] p-4 dark:border-[#1F344D] dark:bg-[#10243A]">
            <div className="text-sm font-semibold">Chat input placeholder</div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Next phase: connect this to a case-aware AI API with tool actions and confirmation buttons.
            </p>
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1F344D] dark:bg-[#0B1A2B]">
          <h3 className="text-lg font-semibold">Assistant powers</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <div>• Answer case questions</div>
            <div>• Draft and improve wording</div>
            <div>• Create suggested tool actions</div>
            <div>• Translate into any language</div>
            <div>• Check bundle/export readiness</div>
          </div>
        </aside>
      </div>
    </CaseWorkspaceShell>
  );
}
