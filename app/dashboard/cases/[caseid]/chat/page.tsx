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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-semibold tracking-tight">Chat</h2>
          </div>

          <div className="flex-1 space-y-4 py-5">
            <div className="max-w-[88%] rounded-3xl bg-[#F6F8FA] p-4 text-sm leading-6 text-slate-700">
              Ask me anything about this case. I can help with your chronology, statements, documents, evidence, calendar, bundle and translation.
            </div>
          </div>

          <form className="mt-auto flex gap-2 rounded-2xl border border-slate-200 bg-[#F7F9FB] p-2">
            <input
              disabled
              placeholder="Chat will be connected in the next AI phase"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-500 outline-none"
            />
            <button disabled className="rounded-xl bg-[#0B1A2B] px-4 py-2 text-sm font-semibold text-white opacity-70">
              Send
            </button>
          </form>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl">
          <h3 className="text-base font-semibold">Connected tools</h3>
          <div className="mt-4 grid gap-2 text-sm text-slate-700">
            <div className="rounded-2xl bg-[#F7F9FB] p-3">Chronology</div>
            <div className="rounded-2xl bg-[#F7F9FB] p-3">Statements</div>
            <div className="rounded-2xl bg-[#F7F9FB] p-3">Documents</div>
            <div className="rounded-2xl bg-[#F7F9FB] p-3">Evidence</div>
            <div className="rounded-2xl bg-[#F7F9FB] p-3">Calendar</div>
            <div className="rounded-2xl bg-[#F7F9FB] p-3">Bundle</div>
          </div>
        </aside>
      </div>
    </CaseWorkspaceShell>
  );
}
