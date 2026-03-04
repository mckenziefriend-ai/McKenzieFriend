import { redirect } from "next/navigation";
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

export default async function CasesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const unlock = Array.isArray(sp.unlock) ? sp.unlock[0] : sp.unlock;

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

    redirect(`/dashboard/cases/${data.id}/chronology`);
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
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-zinc-600">
              CHRONOLOGY GENERATOR
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Cases
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Create a case, then add events in date order.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
          >
            Back to dashboard
          </Link>
        </div>

        {unlock === "wrong" ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Incorrect password.
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-sm font-semibold text-zinc-900">
            Create a new case
          </div>

          <form
            action={createCase}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <input
              name="title"
              placeholder="Case title (e.g. Child arrangements)"
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

          <div className="mt-3 text-xs text-zinc-500">
            Private beta • signed in as {user.email}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-zinc-900">Your cases</div>
            <div className="text-xs text-zinc-500">{rows.length} total</div>
          </div>

          <div className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
            {rows.length > 0 ? (
              rows.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <Link
                    href={`/dashboard/cases/${c.id}/chronology`}
                    className="min-w-0 flex-1 rounded-xl px-2 py-1 hover:bg-zinc-50"
                  >
                    <div className="truncate font-semibold text-zinc-900">
                      {c.title}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Created {formatUKDateTime(c.created_at)}
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/dashboard/cases/${c.id}/chronology`}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50"
                    >
                      Open
                    </Link>

                    <DeleteCaseButton caseId={c.id} action={deleteCase} />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-zinc-700">
                No cases yet. Create your first one above.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
