import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const defaultCaseId = cookieStore.get("mf_default_case_id")?.value;

  if (defaultCaseId) {
    const { data: defaultCase } = await supabase
      .from("cases")
      .select("id")
      .eq("id", defaultCaseId)
      .eq("user_id", user.id)
      .single();

    if (defaultCase?.id) redirect(`/dashboard/cases/${defaultCase.id}`);
  }

  const { data: cases } = await supabase
    .from("cases")
    .select("id,title,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const rows = (cases as Array<{ id: string; title: string; created_at: string | null }> | null) ?? [];

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#0B1A2B]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Home" className="inline-flex items-center"><Image src="/logo.png" alt="McKenzie Friend AI" width={150} height={38} priority className="h-7 w-auto object-contain" /></Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Sign out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-3xl bg-[#0B1A2B] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#88D2DC]">Case dashboard</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Your case workspace</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Open a case or create a new one.
              </p>
            </div>
            <Link href="/dashboard/cases" className="rounded-2xl bg-[#88D2DC] px-5 py-3 text-center text-sm font-bold text-[#07111F] hover:bg-[#A3E4EC]">
              Open cases
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Recent cases</h2>
                <p className="mt-1 text-sm text-slate-600">Open a case or create a new one to start working.</p>
              </div>
              <Link href="/dashboard/cases" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">View all</Link>
            </div>

            <div className="mt-5 space-y-3">
              {rows.length > 0 ? (
                rows.map((caseRow) => (
                  <Link key={caseRow.id} href={`/dashboard/cases/${caseRow.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:border-[#88D2DC] hover:bg-[#88D2DC]/10">
                    <div className="font-semibold">{caseRow.title}</div>
                    <div className="mt-1 text-xs text-slate-500">Open case hub →</div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
                  No cases yet. Create your first case from the cases page.
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2B7C86]">Workspace</div>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <Step n="1" title="Open a case" text="Each case has its own hub." />
              <Step n="2" title="Use the AI assistant" text="Ask, draft and check." />
              <Step n="3" title="Build the file" text="Chronology, statements and documents stay together." />
              <Step n="4" title="Build a bundle" text="Put the final case pack together." />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#88D2DC]/30 text-xs font-bold text-[#0B1A2B]">{n}</div>
      <div>
        <div className="font-semibold text-[#0B1A2B]">{title}</div>
        <div className="mt-0.5 text-slate-600">{text}</div>
      </div>
    </div>
  );
}
