import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type StatementRow = {
  id: string;
  title: string;
  statement_by: string | null;
  statement_date: string | null;
  created_at: string | null;
};

function formatDateUK(dateISO: string) {
  return new Date(dateISO).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function StatementsListPage({
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

  const { data: statements } = await supabase
    .from("case_statements")
    .select("id,title,statement_by,statement_date,created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  const rows = (statements as StatementRow[] | null) ?? [];

  async function createStatement(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data, error } = await supabase
      .from("case_statements")
      .insert({
        case_id: caseId,
        title,
        body: "",
      })
      .select("id")
      .single();

    if (error || !data?.id) redirect(`/dashboard/cases/${caseId}/statements`);

    redirect(`/dashboard/cases/${caseId}/statements/${data.id}`);
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-zinc-600">CASE</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Statements
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Create and edit witness statements for:{" "}
              <span className="font-semibold">{caseRow.title}</span>
            </p>
          </div>

          <Link
            href={`/dashboard/cases/${caseId}/chronology`}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
          >
            Back
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-sm font-semibold text-zinc-900">
            Create a new statement
          </div>

          <form
            action={createStatement}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <input
              name="title"
              placeholder="Statement title (e.g. Witness statement of Applicant)"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              required
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
            >
              Create
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-zinc-900">
              Your statements
            </div>
            <div className="text-xs text-zinc-500">{rows.length} total</div>
          </div>

          <div className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
            {rows.length > 0 ? (
              rows.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900">{s.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {s.statement_by ? `By ${s.statement_by} • ` : ""}
                      {s.statement_date ? `Dated ${formatDateUK(s.statement_date)} • ` : ""}
                      {s.created_at ? `Created ${new Date(s.created_at).toLocaleString("en-GB")}` : ""}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/dashboard/cases/${caseId}/statements/${s.id}`}
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-zinc-700">
                No statements yet. Create your first one above.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
