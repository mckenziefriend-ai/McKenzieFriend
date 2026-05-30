import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function CaseHomePage({
  params,
}: {
  params: Promise<{ caseid: string }>;
}) {
  const { caseid: caseId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id,title,created_at,case_number,court_name,hearing_datetime")
    .eq("id", caseId)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  const [{ count: eventsCount }, { count: statementsCount }] = await Promise.all([
    supabase.from("case_events").select("id", { count: "exact", head: true }).eq("case_id", caseId),
    supabase.from("case_statements").select("id", { count: "exact", head: true }).eq("case_id", caseId),
  ]);

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Hub">
      <div className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <HubCard title="Chronology" value={`${eventsCount ?? 0} events`} href={`/dashboard/cases/${caseId}/chronology`} text="Build the timeline." />
          <HubCard title="Statements" value={`${statementsCount ?? 0} drafts`} href={`/dashboard/cases/${caseId}/statements`} text="Draft witness or position statements." />
          <HubCard title="Documents" value="Storage" href={`/dashboard/cases/${caseId}/documents`} text="Upload and organise the case file." />
          <HubCard title="Bundle" value="Builder" href={`/dashboard/cases/${caseId}/bundle`} text="Prepare a hearing bundle." />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
          <h3 className="text-lg font-semibold">Case details</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Court" value={caseRow.court_name || "Not added yet"} />
            <Row label="Case number" value={caseRow.case_number || "Not added yet"} />
            <Row label="Next hearing" value={caseRow.hearing_datetime || "Not added yet"} />
            <Row label="Created" value={new Date(caseRow.created_at).toLocaleDateString("en-GB")} />
          </dl>
        </section>
      </div>
    </CaseWorkspaceShell>
  );
}

function HubCard({ title, value, text, href }: { title: string; value: string; text: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition sm:rounded-3xl hover:border-[#88D2DC] hover:bg-[#88D2DC]/10  ">
      <div className="text-sm font-semibold text-slate-500 ">{title}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-sm text-slate-600 ">{text}</div>
    </Link>
  );
}

function UnusedNextStep({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 text-sm font-semibold hover:bg-slate-50">
      <span>{title}</span>
      <span>→</span>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl border border-slate-100 bg-[#F7F9FB] p-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
