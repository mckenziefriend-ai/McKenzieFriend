import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email = user.email ?? "Unknown";

  // profile gate (private beta)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_private_beta")
    .eq("id", user.id)
    .single();

  const isPrivateBeta = !!profile?.is_private_beta;

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* Navy surface */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200 shadow-sm">
          {/* Background gradient */}
          <div className="relative bg-gradient-to-b from-[#0B1A2B] via-[#111827] to-[#0B1220]">
            {/* Subtle grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.045), rgba(255,255,255,0.045) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(90deg, rgba(255,255,255,0.035), rgba(255,255,255,0.035) 1px, transparent 1px, transparent 64px)",
              }}
            />
            {/* Glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 18%, rgba(255,255,255,0.02) 38%, rgba(255,255,255,0) 60%)",
              }}
            />

            <div className="relative px-6 py-10 sm:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Dashboard
                  </h1>
                  <p className="mt-2 text-sm text-white/75">
                    Signed in as{" "}
                    <span className="font-medium text-white">{email}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    Home
                  </Link>

                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/15 hover:bg-[#0A1726]"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {/* ✅ Chronology now lives under /dashboard/cases */}
                <Tile
                  title="Chronology"
                  desc="Create a case and build the chronology."
                  href="/dashboard/cases"
                />
                <Tile
                  title="Documents"
                  desc="Upload and organise case documents."
                  href="#"
                />
                <Tile
                  title="Checklists"
                  desc="Preparation steps and templates."
                  href="#"
                />
              </div>

              {!isPrivateBeta ? (
                <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-5 text-sm text-white/80">
                  Private beta is currently restricted.
                </div>
              ) : (
                <form
                  action="/dashboard/chronology/unlock"
                  method="post"
                  className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-5"
                >
                  <div className="text-sm font-semibold text-white">
                    Private tools
                  </div>
                  <div className="mt-1 text-xs text-white/70">
                    Enter password to unlock chronology tools.
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      name="password"
                      type="password"
                      required
                      placeholder="Password"
                      className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/25"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/15 hover:bg-[#0A1726]"
                    >
                      Unlock
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-600">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
            <span className="text-zinc-500">England &amp; Wales</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function Tile({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-6 text-white shadow-sm backdrop-blur-sm transition hover:bg-white/15"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <span className="text-white/60 group-hover:text-white/80">→</span>
        </div>
        <p className="mt-2 text-sm text-white/75">{desc}</p>
      </div>
    </Link>
  );
}
