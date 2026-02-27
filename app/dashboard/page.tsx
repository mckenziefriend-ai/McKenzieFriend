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
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "Account";

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Signed in as <span className="font-medium text-zinc-900">{email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Home
            </Link>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Content */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Welcome / Status */}
          <Card className="lg:col-span-2">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold">Welcome, {displayName}</h2>
                <p className="mt-2 text-sm text-zinc-700">
                  This is a clean shell dashboard. Plug your actual features into the
                  tiles below (documents, timelines, uploads, chat, etc.).
                </p>
              </div>

              <Pill>Authenticated</Pill>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Stat label="Account" value="Active" />
              <Stat label="User ID" value={user.id.slice(0, 8) + "…"} />
              <Stat
                label="Email verified"
                value={user.email_confirmed_at ? "Yes" : "No"}
              />
              <Stat
                label="Provider"
                value={(user.app_metadata?.provider as string | undefined) ?? "email"}
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
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

          {/* Quick actions */}
          <Card>
            <h3 className="text-lg font-semibold">Quick actions</h3>
            <p className="mt-2 text-sm text-zinc-700">
              Add links to the key flows you want users to hit first.
            </p>

            <div className="mt-6 space-y-3">
              <ActionRow
                title="Start a new case pack"
                desc="Create a folder structure and checklist."
                href="#"
              />
              <ActionRow
                title="Upload documents"
                desc="Drop PDFs and evidence bundles."
                href="#"
              />
              <ActionRow
                title="Generate a timeline"
                desc="Turn notes into a structured chronology."
                href="#"
              />
            </div>

            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
              <div className="font-semibold text-zinc-800">Reminder</div>
              <div className="mt-1">
                This product is not a law firm and does not provide regulated legal
                advice.
              </div>
            </div>
          </Card>

          {/* Tiles */}
          <div className="lg:col-span-3 grid gap-6 md:grid-cols-3">
            <Tile
              title="Documents"
              desc="Storage + tagging + export-ready bundles."
              badge="Coming soon"
            />
            <Tile
              title="Prompts & templates"
              desc="Structured prompts for statements, schedules, and checklists."
              badge="Coming soon"
            />
            <Tile
              title="Hearings"
              desc="Dates, reminders, and court-day notes."
              badge="Coming soon"
            />
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800">
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs font-semibold text-zinc-600">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function ActionRow({
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
      className="group block rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          <div className="mt-1 text-xs text-zinc-600">{desc}</div>
        </div>
        <div className="mt-0.5 text-zinc-400 group-hover:text-zinc-600">→</div>
      </div>
    </Link>
  );
}

function Tile({
  title,
  desc,
  badge,
}: {
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/[0.03] via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{title}</h3>
          {badge ? (
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-zinc-700">{desc}</p>
      </div>
    </div>
  );
}
