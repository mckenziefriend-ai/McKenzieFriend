import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-zinc-600">
              STATEMENT EDITOR
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {caseRow.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Edit freely. You can export a court-style print preview.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/cases/${caseId}/statements/${statementid}/export`}
              className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
            >
              Export
            </Link>
            <Link
              href={`/dashboard/cases/${caseId}/statements`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <form action={saveStatement} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Title
                </label>
                <input
                  name="title"
                  defaultValue={st.title ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Statement date
                </label>
                <input
                  name="statement_date"
                  type="date"
                  defaultValue={st.statement_date ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Statement by (optional)
              </label>
              <input
                name="statement_by"
                defaultValue={st.statement_by ?? ""}
                placeholder="e.g. Applicant / Respondent / Full name"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Body
              </label>
              <textarea
                name="body"
                defaultValue={st.body ?? ""}
                placeholder="Type your statement here..."
                className="mt-1 min-h-[420px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-zinc-400"
              />
              <div className="mt-2 text-xs text-zinc-500">
                Tip: keep paragraphs short. You can paste full text and edit
                directly.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <form action={deleteStatement}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Delete statement
                </button>
              </form>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
