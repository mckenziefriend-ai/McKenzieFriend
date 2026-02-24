"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SectionId = "top" | "paths" | "boundaries" | "who" | "cta";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "top", label: "Home" },
  { id: "paths", label: "Two Paths" },
  { id: "boundaries", label: "Boundaries" },
  { id: "who", label: "Who It’s For" },
  { id: "cta", label: "Get Started" },
];

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  const [active, setActive] = useState<SectionId>("top");
  const [scrolled, setScrolled] = useState(false);

  const sectionEls = useRef<Record<string, HTMLElement | null>>({});
  const sectionIds = useMemo(() => SECTIONS.map((s) => s.id), []);

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

  useEffect(() => {
    const els: HTMLElement[] = [];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      sectionEls.current[id] = el;
      if (el) els.push(el);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) =>
            a.boundingClientRect.top > b.boundingClientRect.top ? 1 : -1
          );

        if (visible[0]?.target?.id) {
          setActive(visible[0].target.id as SectionId);
        }
      },
      { root: null, rootMargin: "-15% 0px -70% 0px", threshold: [0.01, 0.1, 0.2] }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Top Nav */}
      <header
        className={cn(
          "sticky top-0 z-50 bg-white/80 backdrop-blur",
          scrolled ? "border-b border-zinc-200" : "border-b border-transparent"
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => scrollTo("top")}
            className="group inline-flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-zinc-50"
            aria-label="Scroll to top"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 sm:flex">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition",
                  active === s.id
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTo("cta")}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Start
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs transition",
                  active === s.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700">
              <span className="h-2 w-2 rounded-full bg-zinc-900" />
              Built for clarity, preparation, and calm support
            </p>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </h1>

            <p className="mt-5 text-base leading-7 text-zinc-700 sm:text-lg sm:leading-8">
              A focused support platform for people representing themselves — combining practical preparation tools
              with optional in-person assistance.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => scrollTo("paths")}
                className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Explore the two paths
              </button>
              <button
                onClick={() => scrollTo("boundaries")}
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                Read the boundaries
              </button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <Stat label="Designed for" value="Clarity" />
              <Stat label="Built around" value="Preparation" />
              <Stat label="Tone" value="Calm + factual" />
            </div>
          </div>
        </div>
      </section>

      {/* TWO CLEAR PATHS */}
      <section id="paths" className="relative border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold text-zinc-500">02</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Two Clear Paths <span className="text-zinc-500"></span>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-700">
            Choose the type of support you need. Keep it practical. Keep it clear.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="flex items-center gap-3">
                <BadgeIcon>👤</BadgeIcon>
                <h3 className="text-xl font-semibold">Personal McKenzie Friend Support</h3>
              </div>

              <p className="mt-6 text-sm font-semibold text-zinc-700">Short explanation:</p>
              <Inset>
                Independent McKenzie Friend assistance for litigants in person. Support may include document
                organisation, note-taking, quiet assistance in court, and help understanding procedure.
              </Inset>

              <div className="mt-7">
                <button
                  onClick={() => scrollTo("cta")}
                  className="w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto"
                >
                  Learn about personal support
                </button>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <BadgeIcon>🤖</BadgeIcon>
                <h3 className="text-xl font-semibold">AI Preparation Tools</h3>
              </div>

              <p className="mt-6 text-sm font-semibold text-zinc-700">Short explanation:</p>
              <Inset>
                AI-powered tools designed to help you prepare: organise information, generate checklists, structure
                notes, draft questions to ask, and understand processes at a general level.
              </Inset>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => scrollTo("cta")}
                  className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Explore AI tools
                </button>
                <button
                  onClick={() => scrollTo("boundaries")}
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Read limitations
                </button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* BOUNDARIES */}
      <section id="boundaries" className="relative border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold text-zinc-500">04</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Clear Boundaries <span className="text-zinc-500"></span>
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-700">Visible and calm:</p>

          <Card>
            <Inset>
              McKenzieFriend.ai is not a solicitor’s practice and does not provide regulated legal advice.
              <br />
              <br />
              The AI tools provide general information and preparation support only.
              <br />
              <br />
              Personal McKenzie Friend assistance does not include rights of audience or the conduct of litigation
              unless expressly permitted by the court.
            </Inset>

          </Card>
        </div>
      </section>

      {/* WHO */}
      <section id="who" className="relative border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold text-zinc-500">05</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Who It’s For</h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <p className="text-base leading-8 text-zinc-800">
                Designed for individuals representing themselves in the Family Court of England &amp; Wales who want
                clearer understanding and better preparation.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Pill>✔ Organise documents + notes</Pill>
                <Pill>✔ Build a clear timeline</Pill>
                <Pill>✔ Prepare questions + points</Pill>
                <Pill>✔ Reduce overwhelm</Pill>
              </div>
            </Card>

            <Card className="lg:col-span-5">
  <p className="text-sm font-semibold text-zinc-700">Operating principles</p>
  <ul className="mt-4 space-y-3 text-sm leading-7 text-zinc-700">
    <li>• Plain-language summaries; references where relevant.</li>
    <li>• Preparation-focused support: structure, clarity, and next steps.</li>
    <li>• Scope-controlled: no conduct of litigation; no rights of audience unless permitted by the court.</li>
    <li>• Clear limitations and signposting to appropriate professional advice when needed.</li>
    <li>• Confidentiality-minded handling of information (use only what is necessary).</li>
  </ul>
</Card>

      {/* CTA */}
      <section id="cta" className="relative border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <Card>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Get started</h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-700">
              Choose a path: personal McKenzie Friend support or AI preparation tools. Clear scope. Clear boundaries.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#paths"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                View the two paths
              </a>
              <a
                href="#boundaries"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                Read boundaries
              </a>
            </div>

            <p className="mt-6 text-xs text-zinc-600">
              McKenzieFriend.ai provides general information and preparation support. It does not provide regulated legal
              advice.
            </p>
          </Card>

          <footer className="mt-10 flex flex-col gap-2 border-t border-zinc-200 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
            <span className="text-zinc-500">England &amp; Wales</span>
          </footer>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold text-zinc-600">{label}</p>
      <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
    </div>
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
  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-base leading-7 text-zinc-800">
      {children}
    </div>
  );
}

function BadgeIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white">
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
      {children}
    </div>
  );
}
