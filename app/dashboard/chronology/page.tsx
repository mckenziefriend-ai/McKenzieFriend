import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function ChronologyHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // profile gate
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_private_beta")
    .eq("id", user.id)
    .single();

  if (!profile?.is_private_beta) redirect("/");

  // password gate (cookie)
  const cookieStore = await cookies();
  const unlocked = cookieStore.get("chrono_unlocked")?.value === "1";
  if (!unlocked) redirect("/dashboard");

  // load cases
  const { data: cases, error } = await supabase
    .from("cases")
    .select("id,title,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    // keep it simple: if RLS/config issue, show something useful
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Chronology generator
          </h1>
          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
          >
            Back
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">
            Could not load cases
          </div>
          <pre className="mt-3 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </main>
    );
  }

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
      .insert({ title, user_id: user.id })
      .select("id")
      .single();

    if (error || !data?.id) {
      // fallback: go back to list (you can add error UI later)
      redirect("/dashboard/chronology");
    }

    redirect(`/dashboard/chronology/${data.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Chronology generator
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

      {/* Create case */}
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold">Create a new case</h2>

        <form action={createCase} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="title"
            placeholder="Case title (e.g. Child arrangements)"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
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

      {/* Case list */}
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Your cases</h2>
          <span className="text-xs text-zinc-500">{cases?.length ?? 0} total</span>
        </div>

        {cases && cases.length > 0 ? (
          <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/chronology/${c.id}`}
                className="block bg-white p-4 hover:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900">
                      {c.title}
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Created{" "}
                      {c.created_at
                        ? new Date(c.created_at as string).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                  <div className="text-zinc-400">→</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            No cases yet. Create your first one above.
          </div>
        )}
      </div>
    </main>
  );
}
