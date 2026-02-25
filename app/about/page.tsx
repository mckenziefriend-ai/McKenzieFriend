export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50">
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

      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold text-zinc-500">About</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            What McKenzieFriend.ai is
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-700">
            McKenzieFriend.ai provides preparation-focused support for litigants in person in England &amp; Wales.
            It offers two routes: independent McKenzie Friend support, and AI preparation tools designed to help you
            organise information and prepare more clearly.
          </p>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
            <p className="text-sm font-semibold text-zinc-900">Important</p>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-zinc-700">
              <li>• Not a law firm. Not regulated legal advice.</li>
              <li>• AI outputs are general and should be checked for accuracy and suitability.</li>
              <li>• McKenzie Friend assistance is subject to the court’s directions and applicable rules.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Who it’s for</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-700">
            People representing themselves who want a calmer, more structured way to prepare: organising documents,
            building a chronology, preparing for hearings, and drafting clear question prompts.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Pill>Document organisation</Pill>
            <Pill>Chronology &amp; timeline</Pill>
            <Pill>Hearing preparation</Pill>
            <Pill>Question prompts</Pill>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How to use it</h2>
          <ol className="mt-5 max-w-3xl list-decimal space-y-3 pl-5 text-base leading-7 text-zinc-700">
            <li>Choose a path on the home page.</li>
            <li>Read the boundaries and limitations.</li>
            <li>Proceed with the option that fits your situation.</li>
          </ol>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href="/#paths"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Review the two paths
            </a>
            <a
              href="/#boundaries"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
            >
              Review boundaries
            </a>
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
      {children}
    </div>
  );
}
