import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import DeleteCaseButton from "./DeleteCaseButton";

export const dynamic = "force-dynamic";

type CaseRow = {
  id: string;
  title: string;
  created_at: string | null;
};

function formatUKDateTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CasesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const defaultCaseId = cookieStore.get("mf_default_case_id")?.value;

  const { data: cases } = await supabase
    .from("cases")
    .select("id,title,created_at")
    .order("created_at", { ascending: false });

  const rows = (cases as CaseRow[] | null) ?? [];

  async function createCase(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data, error } = await supabase
      .from("cases")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();

    if (error || !data?.id) redirect("/dashboard/cases");

    redirect(`/dashboard/cases/${data.id}`);
  }

  async function setDefaultCase(formData: FormData) {
    "use server";

    const caseId = String(formData.get("case_id") ?? "").trim();
    if (!caseId) redirect("/dashboard/cases");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: owned } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .single();

    if (!owned?.id) redirect("/dashboard/cases");

    const cookieStore = await cookies();
    cookieStore.set("mf_default_case_id", caseId, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    redirect(`/dashboard/cases/${caseId}`);
  }

  async function deleteCase(formData: FormData) {
    "use server";

    const caseId = String(formData.get("case_id") ?? "").trim();
    if (!caseId) redirect("/dashboard/cases");

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: owned } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .single();

    if (!owned) redirect("/dashboard/cases");

    await supabase.from("cases").delete().eq("id", caseId);

    redirect("/dashboard/cases");
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#0B1A2B]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" aria-label="Dashboard" className="inline-flex items-center"><Image src="/logo.png" alt="McKenzie Friend AI" width={150} height={38} priority className="h-7 w-auto object-contain" /></Link>
          <Link href="/dashboard" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Dashboard</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2B7C86]">New case</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cases</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Open a case or set one to open by default.
            </p>

            <form action={createCase} className="mt-6 space-y-3">
              <input
                name="title"
                placeholder="Case title"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20"
                required
              />
              <button type="submit" className="w-full rounded-2xl bg-[#0B1A2B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10243A]">
                Create case
              </button>
            </form>

            
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Your cases</h2>
                <p className="mt-1 text-sm text-slate-600">Open a case hub.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{rows.length} total</div>
            </div>

            <div className="mt-6 space-y-3">
              {rows.length > 0 ? (
                rows.map((c) => {
                  const isDefault = defaultCaseId === c.id;
                  return (
                    <div key={c.id} className="rounded-3xl border border-slate-200 p-4 transition hover:border-[#88D2DC] hover:bg-[#88D2DC]/5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <Link href={`/dashboard/cases/${c.id}`} className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-base font-semibold">{c.title}</div>
                            {isDefault ? <span className="rounded-full bg-[#88D2DC]/25 px-2.5 py-1 text-xs font-bold text-[#0B1A2B]">Default</span> : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Created {formatUKDateTime(c.created_at)}</div>
                        </Link>

                        <div className="flex shrink-0 items-center gap-2">
                          <Link href={`/dashboard/cases/${c.id}`} className="rounded-xl bg-[#0B1A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10243A]">Open</Link>

                          <details className="relative">
                            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 text-lg font-bold hover:bg-slate-50">⋯</summary>
                            <div className="absolute right-0 z-10 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                              <form action={setDefaultCase}>
                                <input type="hidden" name="case_id" value={c.id} />
                                <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50">
                                  Open by default
                                </button>
                              </form>
                            </div>
                          </details>

                          <DeleteCaseButton caseId={c.id} action={deleteCase} />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                  No cases yet. Create your first case on the left.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
