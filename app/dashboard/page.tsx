import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { unlock?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email = user.email ?? "Unknown";

  // Cookie-based unlock state
  const cookieStore = await cookies();
  const chronoUnlocked = cookieStore.get("chrono_unlocked")?.value === "1";
  const unlockState = searchParams?.unlock; // "wrong" | "ok" | undefined

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
                <Tile
                  title="Documents"
                  desc="Upload and organise case documents."
                  href="#"
                />

                {/* 🔒 Chronology lock tile (replaces Timeline) */}
                <div className="group relative block overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-6 text-white shadow-sm backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-semibold">
                        Chronology generator
                      </h3>
                      <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                        Private
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-white/75">
                      Locked behind a password while it’s in development.
                    </p>

                    <div className="mt-4">
                      {chronoUnlocked ? (
                        <Link
                          href="/dashboard/chronology"
                          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white/90"
                        >
                          Open
                        </Link>
                      ) : (
                        <form
                          action="/dashboard/chronology/unlock"
                          method="post"
                          className="flex flex-col gap-3"
                        >
                          <input
                            name="password"
                            type="password"
                            placeholder="Enter password"
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/30"
                            autoComplete="current-password"
                          />

                          {unlockState === "wrong" ? (
                            <div className="text-xs text-rose-200">
                              Incorrect password.
                            </div>
                          ) : null}

                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-white/15 hover:bg-[#0A1726]"
                          >
                            Unlock
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>

                <Tile
                  title="Checklists"
                  desc="Preparation steps and templates."
                  href="#"
                />
              </div>
            </div>
          </div>
        </div>

        {/* White section */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="text-xl font-semibold tracking-tight">
              Getting started
            </h2>
            <p className="mt-2 text-sm text-zinc-700">
              Choose a section to begin. Your workspace will appear here as tools
              are enabled.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0A1726]"
              >
                Contact support
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Settings
              </Link>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold">Notes</h3>
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
              <div className="font-semibold text-zinc-800">Boundary</div>
              <div className="mt-1">
                Not a law firm. Not regulated legal advice.
              </div>
            </div>
          </Card>
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

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
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
