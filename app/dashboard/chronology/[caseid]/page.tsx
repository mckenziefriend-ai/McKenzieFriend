import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function CasePage({
  params,
}: {
  params: { caseId: string };
}) {
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
    .eq("id", params.caseId)
    .single();

  if (!caseRow) redirect("/dashboard/chronology");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{caseRow.title}</h1>
          <p className="mt-2 text-sm text-zinc-700">
            Case workspace (events UI next).
          </p>
        </div>

        <Link
          href="/dashboard/chronology"
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
        >
          Back
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-sm font-semibold text-zinc-900">Next step</div>
        <div className="mt-2 text-sm text-zinc-700">
          Add events (date, what happened, evidence), list them sorted, then export.
        </div>
      </div>
    </main>
  );
}
