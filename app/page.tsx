"use client";

import { useEffect, useState, Suspense } from "react";
import SiteHeader from "./components/SiteHeader";
import SignedOutPopup from "./components/SignedOutPopup";

type SectionId =
  | "top"
  | "paths"
  | "features"
  | "how"
  | "boundaries"
  | "privacy"
  | "who"
  | "cta";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  function scrollTo(id: SectionId) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <SignedOutPopup />
      </Suspense>

      <div className="min-h-screen bg-white text-zinc-950">
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
          }
        `}</style>

        <SiteHeader onHomeClick={() => scrollTo("top")} />

        <section id="top" className="relative overflow-hidden">
          <div className="hero-surface relative">
            <div className="hero-grid absolute inset-0 pointer-events-none" />
            <div className="hero-glow absolute inset-0 pointer-events-none" />

            <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                McKenzieFriend<span className="text-white/80">.ai</span>
              </h1>

              <p className="mt-5 max-w-2xl text-white/80 sm:text-lg">
                AI-assisted preparation for Family Court: structure your case, organise documents, and build clear bundles.
              </p>

              <div className="mt-6 space-y-2 text-white/70">
                <p>Built for litigants in person in England &amp; Wales.</p>
                <p className="text-xs text-white/60">Not a law firm. Not regulated legal advice.</p>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-white/90"
                >
                  Create an account
                </a>
                <button
                  onClick={() => scrollTo("how")}
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/0 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  See how it works
                </button>
              </div>

              <div className="mt-8 text-xs text-white/60">
                After signup you’ll access your dashboard to manage timelines, drafts, checklists, and document packs.
              </div>
            </div>
          </div>
        </section>

        <section id="paths" className="border-t border-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Two AI workflows</h2>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <DecisionCard
                title="Self-serve dashboard"
                icon="🧠"
                accent="from-sky-500/20 via-transparent to-transparent"
              >
                <p className="mt-2 text-sm text-zinc-700">
                  Jump straight into your workspace. Create timelines, generate structured notes, build checklists, and
                  organise your document pack.
                </p>

                <ul className="mt-6 space-y-2 text-sm text-zinc-700">
                  <li>• Case timeline &amp; chronology builder</li>
                  <li>• Evidence tracker &amp; document naming</li>
                  <li>• Drafting prompts for statements and schedules</li>
                  <li>• Export-ready summaries and indexes</li>
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="/signup"
                    className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                  >
                    Sign up
                  </a>
                  <button
                    onClick={() => scrollTo("boundaries")}
                    className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
                  >
                    View limitations
                  </button>
                </div>
              </DecisionCard>

              <DecisionCard
                title="Guided setup"
                icon="🧩"
                accent="from-emerald-500/20 via-transparent to-transparent"
              >
                <p className="mt-2 text-sm text-zinc-700">
                  Start with a guided intake and get a ready-to-work structure inside your dashboard: headings, issue
                  list, task plan, and an initial timeline template.
                </p>

                <ul className="mt-6 space-y-2 text-sm text-zinc-700">
                  <li>• Guided prompts to capture key facts</li>
                  <li>• Auto-generated issue list &amp; next steps</li>
                  <li>• Clean folder structure for your documents</li>
                  <li>• Hearing prep checklist templates</li>
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="/signup"
                    className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                  >
                    Start guided setup
                  </a>
                  <a
                    href="/contact"
                    className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Ask a question
                  </a>
                </div>
              </DecisionCard>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">What the dashboard helps you produce</h2>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <Card>
                <h3 className="text-lg font-semibold">Clear structure</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Turn messy notes into headings, sections, and a consistent format you can keep updating.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                  <li>• Issue list</li>
                  <li>• Position summary</li>
                  <li>• Key facts</li>
                </ul>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold">Chronologies &amp; timelines</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Build a timeline with dates, sources, and links to evidence so you can navigate quickly.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                  <li>• Event log</li>
                  <li>• Evidence pointers</li>
                  <li>• Export-ready chronology</li>
                </ul>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold">Document packs</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Organise documents with a simple structure, consistent naming, and an index template.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                  <li>• Folder plan</li>
                  <li>• Naming conventions</li>
                  <li>• Index &amp; checklist</li>
                </ul>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card>
                <h3 className="text-lg font-semibold">Drafting helpers</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Prompt frameworks to help you draft and refine your own text for statements, schedules, and summaries.
                </p>
                <Inset>
                  The AI can help with structure and clarity. You should verify accuracy, dates, and references before
                  using anything in a filing.
                </Inset>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold">Hearing preparation</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Build a practical plan for what to bring, what to say, and what to check—based on your own facts and
                  documents.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                  <li>• Hearing-day checklist</li>
                  <li>• Questions &amp; points to cover</li>
                  <li>• Next-step task plan</li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <Card>
                <div className="text-sm font-semibold text-zinc-500">Step 1</div>
                <h3 className="mt-2 text-lg font-semibold">Create your workspace</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Sign up to access your dashboard and start a case workspace with the sections you need.
                </p>
              </Card>

              <Card>
                <div className="text-sm font-semibold text-zinc-500">Step 2</div>
                <h3 className="mt-2 text-lg font-semibold">Add your information</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Enter key dates, facts, and documents. The AI helps you shape them into structured outputs.
                </p>
              </Card>

              <Card>
                <div className="text-sm font-semibold text-zinc-500">Step 3</div>
                <h3 className="mt-2 text-lg font-semibold">Export and refine</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Generate drafts, summaries, checklists, and indexes—then review and finalise in your own words.
                </p>
              </Card>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Create an account
              </a>
              <button
                onClick={() => scrollTo("privacy")}
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Privacy &amp; data
              </button>
            </div>
          </div>
        </section>

        <section id="boundaries" className="border-t border-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Limitations</h2>

            <Card className="mt-10">
              <Inset>
                McKenzieFriend.ai is not a solicitor’s practice and does not provide regulated legal advice.
                <br />
                <br />
                The AI is a preparation tool that can help organise information, improve clarity, and suggest structure.
                It may be incomplete or incorrect and must be checked.
                <br />
                <br />
                You are responsible for what you file, what you say, and the decisions you make. If you need legal
                advice, consult a qualified professional.
              </Inset>
            </Card>
          </div>
        </section>

        <section id="privacy" className="border-t border-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy &amp; data</h2>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card>
                <h3 className="text-lg font-semibold">Practical defaults</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  Keep your workspace tidy and only add what is necessary for your preparation.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                  <li>• Avoid uploading sensitive information unless required</li>
                  <li>• Use initials where appropriate</li>
                  <li>• Store your own copies of everything</li>
                </ul>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold">Transparency</h3>
                <p className="mt-2 text-sm text-zinc-700">
                  For full details on handling and retention, refer to your product settings and policies once logged in.
                </p>
                <div className="mt-6">
                  <a
                    href="/contact"
                    className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold hover:bg-zinc-50 inline-flex"
                  >
                    Ask about data handling
                  </a>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section id="who" className="border-t border-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Who this is for</h2>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card>
                <p className="text-zinc-700">
                  Litigants in person in the Family Court of England &amp; Wales who want clearer preparation, better
                  organisation, and a repeatable workflow.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                  <li>• You have lots of dates, messages, and documents</li>
                  <li>• You want a clean chronology and evidence map</li>
                  <li>• You want checklists and structured drafts</li>
                </ul>
              </Card>

              <Card>
                <p className="text-zinc-700">
                  People who prefer a tool-based approach: work inside a dashboard, keep everything in one place, and
                  export outputs as you go.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                  <li>• Ongoing updates as your case evolves</li>
                  <li>• Consistent headings and formatting</li>
                  <li>• Faster prep for directions and hearings</li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        <section id="cta" className="border-t border-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Card>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Get started</h2>

              <p className="mt-4 text-zinc-700">
                Create your account to access the dashboard. If you have questions before signing up, contact us.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Create an account
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold hover:bg-zinc-50"
                >
                  Contact us
                </a>
              </div>
            </Card>

            <footer className="mt-10 border-t border-zinc-200 pt-6 text-xs text-zinc-600">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
                <span className="text-zinc-500">England &amp; Wales</span>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8", className)}>
      {children}
    </div>
  );
}

function Inset({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5">{children}</div>;
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
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:shadow-md">
      <div className={`absolute inset-0 bg-gradient-to-b ${accent}`} />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white">
            {icon}
          </div>
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}
