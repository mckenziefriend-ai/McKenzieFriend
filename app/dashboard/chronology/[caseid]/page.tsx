import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function CasePage({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
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
    .maybeSingle();

  if (!profile?.is_private_beta) redirect("/");

  const cookieStore = await cookies();
  const unlocked = cookieStore.get("chrono_unlocked")?.value === "1";
  if (!unlocked) redirect("/dashboard");

  // ✅ Grab the first param value, regardless of the folder name
  const raw = Object.values(params)[0];
  const caseId = Array.isArray(raw) ? raw[0] : raw;

  // If still missing, show debug keys
  if (!caseId) {
    return (
      <div className="min-h-screen bg-white text-zinc-950">
        <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Missing route param
              </h1>
              <p className="mt-2 text-sm text-zinc-700">
                Next.js isn’t passing the expected param for this route.
              </p>
            </div>
            <Link
              href="/dashboard/chronology"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>

          <pre className="mt-8 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-xs text-zinc-700">
            {JSON.stringify(params, null, 2)}
          </pre>
        </main>
      </div>
    );
  }

  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("id,title,created_at")
    .eq("id", caseId)
    .maybeSingle();

  if (!caseRow) {
    return (
      <div className="min-h-screen bg-white text-zinc-950">
        <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Case not accessible
              </h1>
              <p className="mt-2 text-sm text-zinc-700">
                Couldn’t load the case row for this ID.
              </p>
            </div>
            <Link
              href="/dashboard/chronology"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Debug</div>
            <div className="mt-3 text-sm">
              <div>
                <span className="font-semibold">caseId:</span>{" "}
                <span className="font-mono">{caseId}</span>
              </div>
              <div className="mt-2">
                <span className="font-semibold">params:</span>
              </div>
              <pre className="mt-2 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
                {JSON.stringify(params, null, 2)}
              </pre>
              <div className="mt-4">
                <span className="font-semibold">cases query error:</span>
              </div>
              <pre className="mt-2 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
                {JSON.stringify(caseErr, null, 2)}
              </pre>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ✅ If we got here, param is correct and case exists
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {caseRow.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Your case loaded correctly. Next we’ll re-add the events UI.
            </p>
          </div>

          <Link
            href="/dashboard/chronology"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
          >
            Back
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Loaded</div>
          <div className="mt-2 text-sm text-zinc-700">
            Case ID: <span className="font-mono">{caseId}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
