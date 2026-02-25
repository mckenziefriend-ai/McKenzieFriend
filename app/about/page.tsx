export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </a>

          <nav className="flex items-center gap-2">
            <a
              href="/contact"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-surface relative overflow-hidden">
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="hero-glow absolute inset-0 pointer-events-none" />

        <div className="mx-auto max-w-6xl px-4 py-20 text-white">
          <p className="text-xs font-semibold text-white/60">About</p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            McKenzieFriend<span className="text-white/80">.ai</span>
          </h1>

          <p className="mt-6 max-w-3xl text-lg font-semibold text-white/85">
            AI Preparation for Family & Civil Court.
            <br />
            Independent McKenzie Friend Support.
          </p>

          <div className="mt-6 space-y-1 text-white/70">
            <p>For litigants in person in England & Wales.</p>
            <p className="text-xs text-white/60">
              Not a law firm. Not regulated legal advice.
            </p>
          </div>

          <div className="mt-10">
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-white/90"
            >
              Contact us
            </a>
          </div>
        </div>
      </section>

      {/* Why this exists */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Why this exists
          </h2>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            I have personally navigated the Family Court system as a litigant in person, and understand how complex it can feel.
            That experience informs both my independent McKenzie Friend support and the design of these AI preparation tools.
          </div>
        </div>
      </section>

      {/* Two paths */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Two clear paths
          </h2>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <DecisionCard title="AI preparation tools" icon="🤖">
              <p className="mt-2 text-sm text-zinc-700">
                Structured preparation support including timelines, prompts, and document organisation.
              </p>
              <div className="mt-8">
                <a
                  href="/contact"
                  className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Contact us
                </a>
              </div>
            </DecisionCard>

            <DecisionCard title="Personal McKenzie Friend support" icon="👤">
              <p className="mt-2 text-sm text-zinc-700">
                Practical assistance for litigants in person, subject to court direction and applicable rules.
              </p>
              <div className="mt-8">
                <a
                  href="/contact"
                  className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Proceed with personal support
                </a>
              </div>
            </DecisionCard>
          </div>
        </div>
      </section>

      {/* Boundaries */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Boundaries
          </h2>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
            <ul className="space-y-3 text-sm text-zinc-700">
              <li>• Not a law firm and does not provide regulated legal advice.</li>
              <li>• AI tools provide general preparation support only.</li>
              <li>• Personal assistance does not include rights of audience or litigation conduct unless permitted by the court.</li>
            </ul>

            <div className="mt-10">
              <a
                href="/contact"
                className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Contact us
              </a>
            </div>
          </div>

          <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-600 flex justify-between">
            <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
            <span>England & Wales</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function DecisionCard({ title, icon, children }: any) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white">
          {icon}
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
