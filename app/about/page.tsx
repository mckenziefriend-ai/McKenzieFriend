export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/92 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a
            href="/"
            className="group inline-flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-zinc-50"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <a
              href="/#paths"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Choose a path
            </a>
          </div>
        </div>
      </header>

      {/* About hero (same minimal brand feel) */}
      <section className="relative overflow-hidden">
        <div className="hero-surface relative">
          {/* optional ultra-subtle tech layer */}
          <div className="hero-grid pointer-events-none absolute inset-0" />
          <div className="hero-glow pointer-events-none absolute inset-0" />

          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <p className="text-xs font-semibold text-white/60">About</p>

            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              McKenzieFriend<span className="text-white/80">.ai</span>
            </h1>

            <p className="mt-6 max-w-3xl text-pretty text-lg font-semibold leading-8 text-white/85">
              AI Preparation for Family &amp; Civil Court.
              <br />
              Independent McKenzie Friend Support.
            </p>

            <div className="mt-7 max-w-2xl space-y-2">
              <p className="text-sm leading-6 text-white/70 sm:text-base">
                For litigants in person in England &amp; Wales.
              </p>
              <p className="text-xs leading-5 text-white/60">
                Not a law firm. Not regulated legal advice.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="/#paths"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
              >
                View the two paths
              </a>
              <a
                href="/#boundaries"
                className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Read boundaries
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Credibility / “why this exists” (this is what was missing) */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Why this exists
          </h2>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-base leading-7 text-zinc-800">
              I have personally navigated the Family Court system as a litigant
              in person, and I understand how complex it can feel. That
              experience informs both my independent McKenzie Friend support
              and the design of these AI preparation tools.
            </div>

            <p className="mt-5 text-sm text-zinc-600">
              Short. Relatable. Professional.
            </p>
          </div>
        </div>
      </section>

      {/* What you get (two paths) */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Two clear paths
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-700">
            The service is deliberately split into two routes so you can choose
            what you need without confusion.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <DecisionCard
              title="AI preparation tools"
              icon="🤖"
              accent="from-sky-500/20 via-sky-500/0 to-transparent"
            >
              <p className="mt-2 text-sm leading-7 text-zinc-700">
                Structured preparation support: checklists, timelines, prompts,
                and drafting structure. Outputs are general and should be
                reviewed for accuracy and suitability.
              </p>
              <div className="mt-8">
                <a
                  href="/#paths"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto"
                >
                  Choose AI tools
                </a>
              </div>
            </DecisionCard>

            <DecisionCard
              title="Personal McKenzie Friend support"
              icon="👤"
              accent="from-amber-500/20 via-amber-500/0 to-transparent"
            >
              <p className="mt-2 text-sm leading-7 text-zinc-700">
                Practical assistance for litigants in person, potentially
                including organisation, note-taking, and quiet support in court
                — subject to the court’s directions and applicable rules.
              </p>
              <div className="mt-8">
                <a
                  href="/#paths"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto"
                >
                  Choose personal support
                </a>
              </div>
            </DecisionCard>
          </div>
        </div>
      </section>

      {/* Boundaries (tight + clear) */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Boundaries (plain and direct)
          </h2>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <ul className="space-y-3 text-sm leading-7 text-zinc-700">
              <li>• McKenzieFriend.ai is not a law firm and does not provide regulated legal advice.</li>
              <li>• AI tools provide general information and preparation support only.</li>
              <li>
                • Personal McKenzie Friend assistance does not include rights of audience or the conduct of litigation
                unless permitted by the court.
              </li>
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="/#boundaries"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Read full boundaries
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                Back to home
              </a>
            </div>
          </div>

          <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-600">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
              <span className="text-zinc-500">England &amp; Wales</span>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

function DecisionCard({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-9"
      }
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent}`} />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white">
            {icon}
          </div>
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}
