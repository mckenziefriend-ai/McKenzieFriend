"use client";

import { useEffect, useState } from "react";

type SectionId = "top" | "paths" | "boundaries" | "who" | "cta";

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
    <div className="min-h-screen bg-white text-zinc-950">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => scrollTo("top")}
            className="group inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </button>

          <nav className="flex items-center gap-2">
            <a
              href="/about"
              className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              About
            </a>

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
      <section id="top" className="relative overflow-hidden">
        <div className="hero-surface relative">
          <div className="hero-grid absolute inset-0 pointer-events-none" />
          <div className="hero-glow absolute inset-0 pointer-events-none" />

          <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-20 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              McKenzieFriend<span className="text-white/80">.ai</span>
            </h1>

            <p className="mt-5 max-w-2xl text-white/80 sm:text-lg">
              Independent McKenzie Friend & Developer of AI Court Preparation Tools
            </p>

            <div className="mt-6 space-y-2 text-white/70">
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
        </div>
      </section>

      {/* Two paths */}
      <section id="paths" className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Two clear paths
          </h2>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <DecisionCard
              title="Personal McKenzie Friend support"
              icon="👤"
              accent="from-amber-500/20 via-transparent to-transparent"
            >
              <p className="mt-2 text-sm text-zinc-700">
                Practical assistance for litigants in person. Document organisation, note-taking,
                and quiet support in court — subject to the court’s directions.
              </p>

              <div className="mt-8 flex gap-3 flex-wrap">
                <a
                  href="/contact"
                  className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Proceed with personal support
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
              title="AI preparation tools"
              icon="🤖"
              accent="from-sky-500/20 via-transparent to-transparent"
            >
              <p className="mt-2 text-sm text-zinc-700">
                Tools to support preparation: structure, timelines, prompts, and document organisation.
              </p>

              <div className="mt-8 flex gap-3 flex-wrap">
                <a
                  href="/contact"
                  className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Contact us
                </a>

                <button
                  onClick={() => scrollTo("boundaries")}
                  className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
                >
                  View limitations
                </button>
              </div>
            </DecisionCard>
          </div>
        </div>
      </section>

      {/* Boundaries */}
      <section id="boundaries" className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Boundaries
          </h2>

          <Card>
            <Inset>
              McKenzieFriend.ai is not a solicitor’s practice and does not provide regulated legal advice.
              <br /><br />
              AI tools provide general preparation support only.
              <br /><br />
              Personal assistance does not include rights of audience or conduct of litigation unless permitted by the court.
            </Inset>
          </Card>
        </div>
      </section>

      {/* Who */}
      <section id="who" className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Who this is for
          </h2>

          <Card className="mt-10">
            Individuals representing themselves in the Family Court of England & Wales who want clearer preparation and structured information.
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Card>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Get started
            </h2>

            <p className="mt-4 text-zinc-700">
              Contact us to discuss your situation and the most suitable support.
            </p>

            <div className="mt-8">
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Contact us
              </a>
            </div>
          </Card>

          <footer className="mt-10 border-t border-zinc-200 pt-6 text-xs text-zinc-600 flex justify-between">
            <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
            <span>England & Wales</span>
          </footer>
        </div>
      </section>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8", className)}>{children}</div>;
}

function Inset({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5">{children}</div>;
}

function DecisionCard({ title, icon, accent, children }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm hover:shadow-md transition">
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
