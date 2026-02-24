// app/page.tsx (THE HOMEPAGE)
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
      {
        root: null,
        rootMargin: "-15% 0px -70% 0px",
        threshold: [0.01, 0.1, 0.2],
      }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <div className="min-h-screen bg-black text-white">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-140px] h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-240px] right-[-180px] h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Top Nav */}
      <header
        className={cn(
          "sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-black/50",
          scrolled ? "border-b border-white/10 bg-black/60" : "bg-transparent"
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => scrollTo("top")}
            className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 text-left"
            aria-label="Scroll to top"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm">
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-white/60">.ai</span>
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
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTo("cta")}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
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
                  active === s.id ? "bg-white text-black" : "bg-white/10 text-white/80"
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
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              Built for clarity, preparation, and calm support
            </p>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              McKenzieFriend<span className="text-white/60">.ai</span>
            </h1>

            <p className="mt-5 text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              A focused support platform for people representing themselves — combining practical preparation tools
              with optional in-person assistance (where permitted).
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => scrollTo("paths")}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Explore the two paths
              </button>
              <button
                onClick={() => scrollTo("boundaries")}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
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
      <section id="paths" className="relative border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold text-white/60">02</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Two Clear Paths <span className="text-white/60">(Split Section)</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
            Choose the type of support you need. Keep it practical. Keep it clear.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">👤</div>
                <h3 className="text-xl font-semibold">Personal McKenzie Friend Support</h3>
              </div>

              <p className="mt-6 text-sm font-semibold text-white/70">Short explanation:</p>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-5">
                <p className="text-base leading-7 text-white/80">
                  Independent McKenzie Friend assistance for litigants in person. Support may include document
                  organisation, note-taking, quiet assistance in court, and help understanding procedure.
                </p>
              </div>

              <p className="mt-5 text-sm text-white/60">Keep it factual. No promises.</p>

              <div className="mt-7">
                <button
                  onClick={() => scrollTo("cta")}
                  className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 sm:w-auto"
                >
                  Learn about personal support
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">🤖</div>
                <h3 className="text-xl font-semibold">AI Preparation Tools</h3>
              </div>

              <p className="mt-6 text-sm font-semibold text-white/70">Short explanation:</p>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-5">
                <p className="text-base leading-7 text-white/80">
                  AI-powered tools designed to help you prepare: organise information, generate checklists, structure
                  notes, draft questions to ask, and understand processes at a general level.
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => scrollTo("cta")}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  Explore AI tools
                </button>
                <button
                  onClick={() => scrollTo("boundaries")}
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Read limitations
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOUNDARIES */}
      <section id="boundaries" className="relative border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold text-white/60">04</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Clear Boundaries <span className="text-white/60">(Non-Negotiable)</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-white/70">Visible and calm:</p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="rounded-xl border border-white/10 bg-black/30 p-5">
              <p className="text-base leading-7 text-white/85">
                McKenzieFriend.ai is not a solicitor’s practice and does not provide regulated legal advice.
                <br />
                <br />
                The AI tools provide general information and preparation support only.
                <br />
                <br />
                Personal McKenzie Friend assistance does not include rights of audience or the conduct of litigation
                unless expressly permitted by the court.
              </p>
            </div>

            <p className="mt-5 text-sm text-white/60">That language protects you.</p>
          </div>
        </div>
      </section>

      {/* WHO */}
      <section id="who" className="relative border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold text-white/60">05</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Who It’s For</h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <p className="text-base leading-8 text-white/80">
                Designed for individuals representing themselves in the Family Court of England &amp; Wales who want
                clearer understanding and better preparation.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Pill>✔ Organise documents + notes</Pill>
                <Pill>✔ Build a clear timeline</Pill>
                <Pill>✔ Prepare questions + points</Pill>
                <Pill>✔ Reduce overwhelm</Pill>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <p className="text-sm font-semibold text-white/70">Principles</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/70">
                <li>• Keep it factual.</li>
                <li>• Keep it calm.</li>
                <li>• No inflated claims.</li>
                <li>• Clear limitations.</li>
                <li>• Practical preparation first.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Get started</h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
              Choose a path: personal McKenzie Friend support or AI preparation tools. Clear scope. Clear boundaries.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#paths"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                View the two paths
              </a>
              <a
                href="#boundaries"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                Read boundaries
              </a>
            </div>

            <p className="mt-6 text-xs text-white/50">
              McKenzieFriend.ai provides general information and preparation support. It does not provide regulated legal
              advice.
            </p>
          </div>

          <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
            <span className="text-white/40">England &amp; Wales</span>
          </footer>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold text-white/60">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
      {children}
    </div>
  );
}
