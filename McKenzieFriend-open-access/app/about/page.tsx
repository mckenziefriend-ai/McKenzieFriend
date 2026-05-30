import SiteHeader from "../components/SiteHeader";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <SiteHeader />

      <section className="hero-surface relative overflow-hidden">
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="hero-glow absolute inset-0 pointer-events-none" />

        <div className="mx-auto max-w-6xl px-4 py-20 text-white sm:px-6">
          <p className="text-xs font-semibold text-white/60">About</p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            McKenzieFriend<span className="text-white/80">.ai</span>
          </h1>

          <p className="mt-6 max-w-3xl text-lg font-semibold text-white/85 sm:text-xl">
            AI-assisted preparation for Family Court.
          </p>

          <div className="mt-6 space-y-1 text-white/70">
            <p>Built for litigants in person in England &amp; Wales.</p>
            <p className="text-xs text-white/60">
              Not a law firm. Not regulated legal advice.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-white/90"
            >
              Create an account
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/0 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Contact us
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Why this exists
          </h2>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-base leading-7 text-zinc-800 sm:p-8">
            Family Court preparation often involves large volumes of messages, reports, dates, and procedural steps.
            McKenzieFriend.ai is designed to help you turn unstructured information into clear timelines, organised
            document packs, structured summaries, and practical checklists inside a single dashboard.
            <br />
            <br />
            The aim is to reduce confusion, improve consistency, and make preparation more manageable using AI tools
            that support structure and clarity.
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How you can use it
          </h2>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <DecisionCard title="Self-serve dashboard" icon="🧠">
              <p className="mt-2 text-sm leading-7 text-zinc-700">
                Create a case workspace and build your own structure using AI-assisted tools for organisation and
                drafting support.
              </p>

              <ul className="mt-6 space-y-2 text-sm text-zinc-700">
                <li>• Chronology and timeline builder</li>
                <li>• Issue list and position summary structure</li>
                <li>• Evidence tracker and document naming plan</li>
                <li>• Bundle index and checklist templates</li>
              </ul>

              <div className="mt-8">
                <a
                  href="/signup"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto"
                >
                  Sign up
                </a>
              </div>
            </DecisionCard>

            <DecisionCard title="Guided setup workflow" icon="🧩">
              <p className="mt-2 text-sm leading-7 text-zinc-700">
                Follow structured prompts to capture key facts and generate a ready-to-use workspace layout in your
                dashboard.
              </p>

              <ul className="mt-6 space-y-2 text-sm text-zinc-700">
                <li>• Guided intake questions</li>
                <li>• Auto-generated issue list and task plan</li>
                <li>• Clean folder structure for documents</li>
                <li>• Hearing preparation checklist framework</li>
              </ul>

              <div className="mt-8">
                <a
                  href="/signup"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 sm:w-auto"
                >
                  Start guided setup
                </a>
              </div>
            </DecisionCard>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            What the AI helps you produce
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <InfoCard
              title="Clear structure"
              points={[
                "Issue lists and headings",
                "Position summary framework",
                "Key fact organisation",
              ]}
            />
            <InfoCard
              title="Chronologies"
              points={[
                "Date-based event log",
                "Linked evidence references",
                "Export-ready timeline format",
              ]}
            />
            <InfoCard
              title="Document packs"
              points={[
                "Folder structure plan",
                "Consistent naming conventions",
                "Index and filing checklist",
              ]}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <InfoCard
              title="Drafting frameworks"
              points={[
                "Statement structure prompts",
                "Schedule templates",
                "Refinement suggestions for clarity",
              ]}
            />
            <InfoCard
              title="Hearing preparation"
              points={[
                "Hearing-day checklist",
                "Questions and points outline",
                "Next-step task planning",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>

          <div className="mt-10 space-y-6">
            <FaqItem
              question="Is this legal advice?"
              answer="No. McKenzieFriend.ai is not a law firm and does not provide regulated legal advice. The platform provides general preparation tools to help organise information and improve clarity."
            />

            <FaqItem
              question="Can I rely on the AI outputs?"
              answer="AI-generated outputs may contain errors or omissions. You must review, verify, and adapt all content before using it in any filing or communication. You remain responsible for what you submit to the court."
            />

            <FaqItem
              question="What do I need to get started?"
              answer="You can start with key dates, a summary of your situation, and any relevant documents. The dashboard is designed to help you structure and expand from whatever information you already have."
            />

            <FaqItem
              question="Does this replace a solicitor?"
              answer="No. If you need legal advice tailored to your circumstances, you should consult a qualified solicitor or barrister. This platform is designed to support preparation and organisation only."
            />

            <FaqItem
              question="Is my case handled by a person?"
              answer="The platform is AI-driven. It does not provide representation, attend court, or conduct litigation."
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Boundaries
          </h2>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <ul className="space-y-3 text-sm leading-7 text-zinc-700">
              <li>• Not a law firm and does not provide regulated legal advice.</li>
              <li>• AI tools provide general preparation and organisational support only.</li>
              <li>• AI outputs may be incomplete or incorrect and must be reviewed.</li>
              <li>• You are responsible for filings, statements, and decisions.</li>
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Create an account
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Contact us
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
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:shadow-md">
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

function InfoCard({
  title,
  points,
}: {
  title: string;
  points: string[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm text-zinc-700">
        {points.map((point, i) => (
          <li key={i}>• {point}</li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
      <h3 className="text-base font-semibold text-zinc-900">{question}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-700">{answer}</p>
    </div>
  );
}
