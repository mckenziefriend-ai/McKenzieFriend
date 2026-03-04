import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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
    .select("id,title,created_at")
    .eq("id", caseId)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-zinc-600">CASE</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {caseRow.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Choose a tool for this case.
            </p>
          </div>

          <Link
            href="/dashboard/cases"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
          >
            Back
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href={`/dashboard/cases/${caseId}/chronology`}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:bg-zinc-50"
          >
            <div className="text-sm font-semibold text-zinc-900">
              Chronology
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Add events and export a chronology PDF.
            </div>
          </Link>

          <Link
            href={`/dashboard/cases/${caseId}/statements`}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:bg-zinc-50"
          >
            <div className="text-sm font-semibold text-zinc-900">
              Statements
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Draft and export witness statements.
            </div>
          </Link>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <div className="text-sm font-semibold text-zinc-900">
              Documents (coming soon)
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Upload and organise case documents.
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <div className="text-sm font-semibold text-zinc-900">
              Checklists (coming soon)
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Preparation steps and templates.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
