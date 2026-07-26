"use client";

import { useEffect, useState, Suspense } from "react";
import SiteHeader from "./components/SiteHeader";
import SignedOutPopup from "./components/SignedOutPopup";

type SectionId =
  | "top"
  | "why"
  | "paths"
  | "features"
  | "how"
  | "wellbeing"
  | "boundaries"
  | "privacy"
  | "who"
  | "cta";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

/* ---------- shared button styles ---------- */

const heroPrimaryBtn =
  "group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-lg shadow-sky-950/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

const heroGhostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

const btnDark =
  "group inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [revealReady, setRevealReady] = useState(false);

  function scrollTo(id: SectionId) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Scroll progress bar + back-to-top visibility
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0);
      setScrolled(window.scrollY > 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal-on-scroll for sections (no-JS friendly: hiding only applies once ready)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;
    // Progressive enhancement: only hide-until-revealed once we've confirmed
    // JS + IntersectionObserver are available. Mount-time sync, runs once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevealReady(true);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <SignedOutPopup />
      </Suspense>

      <div className={cn("min-h-screen bg-white text-slate-950", revealReady && "reveals-ready")}>
        <style jsx global>{`
          html {
            scroll-behavior: smooth;
            scroll-padding-top: 5rem;
          }

          .hero-surface {
            background:
              radial-gradient(120% 120% at 50% -20%, rgba(56, 189, 248, 0.18), transparent 55%),
              radial-gradient(90% 80% at 85% 10%, rgba(99, 102, 241, 0.22), transparent 55%),
              linear-gradient(180deg, #0b1220 0%, #0f1a2e 58%, #0b1220 100%);
          }

          .hero-grid {
            background-image:
              linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
            background-size: 46px 46px;
            -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 28%, #000 38%, transparent 80%);
            mask-image: radial-gradient(ellipse 80% 60% at 50% 28%, #000 38%, transparent 80%);
          }

          .hero-glow {
            background: radial-gradient(48% 38% at 50% 0%, rgba(56, 189, 248, 0.28), transparent 70%);
            filter: blur(18px);
          }

          .reveals-ready [data-reveal] {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .reveals-ready [data-reveal].is-visible {
            opacity: 1;
            transform: none;
          }

          @media (prefers-reduced-motion: reduce) {
            html {
              scroll-behavior: auto;
            }
            .reveals-ready [data-reveal] {
              opacity: 1 !important;
              transform: none !important;
              transition: none !important;
            }
          }
        `}</style>

        {/* Scroll progress bar */}
        <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent" aria-hidden="true">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <SiteHeader onHomeClick={() => scrollTo("top")} />

        {/* ---------- HERO ---------- */}
        <section id="top" className="relative overflow-hidden">
          <div className="hero-surface relative">
            <div className="hero-grid absolute inset-0 pointer-events-none" />
            <div className="hero-glow absolute inset-0 pointer-events-none" />

            <div className="relative mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 sm:py-28">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Civil &amp; Family Court · England &amp; Wales
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                McKenzieFriend<span className="text-sky-300/90">.ai</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                AI-assisted preparation for Civil &amp; Family Court: structure your case, organise documents, and build clear bundles.
              </p>

              <div className="mt-6 space-y-1.5 text-white/70">
                <p>Built for litigants in person in England &amp; Wales.</p>
                <p className="text-xs text-white/55">Not a law firm. Not regulated legal advice.</p>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a href="/signup" className={heroPrimaryBtn}>
                  Create an account
                  <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <button onClick={() => scrollTo("how")} className={heroGhostBtn}>
                  See how it works
                </button>
              </div>

              <div className="mt-8 max-w-md text-xs leading-6 text-white/55">
                After signup you’ll access your dashboard to manage timelines, drafts, checklists, and document packs.
              </div>
            </div>
          </div>
        </section>

        {/* ---------- WHY ---------- */}
        <section id="why" className="border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div data-reveal className="max-w-4xl">
              <SectionHeading>Why McKenzieFriend.ai Exists</SectionHeading>

              <Card className="mt-10">
                <p className="text-xl font-semibold leading-relaxed text-slate-950">
                  McKenzieFriend.ai provides AI-assisted preparation tools for people representing themselves in court.
                </p>

                <div className="mt-8 space-y-6 text-base leading-8 text-slate-700">
                  <p>
                    While independent McKenzie Friends can offer valuable assistance, the role has no formal regulation
                    and standards can vary.
                  </p>

                  <p>
                    This platform focuses on <span className="font-semibold text-slate-950">clear preparation</span>,{" "}
                    <span className="font-semibold text-slate-950">organisation</span>, and{" "}
                    <span className="font-semibold text-slate-950">responsible support</span>, helping litigants
                    structure their case, organise documents, and prepare court bundles without crossing professional
                    boundaries.
                  </p>
                </div>

                <Inset tone="brand">
                  <p className="text-base leading-8 text-slate-800">
                    The aim is simple:{" "}
                    <span className="font-semibold text-slate-900">
                      better preparation, clearer structure, and more confident participation in court.
                    </span>
                  </p>
                </Inset>
              </Card>
            </div>
          </div>
        </section>

        {/* ---------- WELLBEING ---------- */}
        <section id="wellbeing" className="border-t border-slate-200 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div data-reveal className="max-w-4xl">
              <SectionHeading>Wellbeing During Court Proceedings</SectionHeading>

              <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                <Card className="border-l-4 border-l-sky-600">
                  <IconChip name="heart" tone="rose" />
                  <p className="mt-5 text-xl font-semibold leading-relaxed text-slate-950">
                    Court proceedings can be stressful and emotionally demanding.
                  </p>

                  <p className="mt-5 text-base leading-8 text-slate-700">
                    For litigants in person, managing documents, deadlines, and unfamiliar procedures can place
                    significant pressure on mental wellbeing.
                  </p>

                  <p className="mt-6 text-base leading-8 text-slate-700">
                    If you are feeling overwhelmed, it is important to seek support. Preparation and support can help
                    reduce unnecessary stress and allow you to approach proceedings more clearly and calmly.
                  </p>
                </Card>

                <Card className="border-l-4 border-l-sky-600">
                  <IconChip name="lifebuoy" tone="sky" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Confidential support</h3>
                  <p className="mt-2 text-sm text-slate-700">
                    The following organisations provide confidential help:
                  </p>

                  <ul className="mt-6 space-y-4 text-sm text-slate-700">
                    <li>
                      <SupportLink href="https://www.samaritans.org/how-we-can-help/contact-samaritan/">
                        Samaritans
                      </SupportLink>{" "}
                      <span className="text-slate-400">—</span> 116 123 (24/7)
                    </li>

                    <li>
                      <SupportLink href="https://www.mind.org.uk/information-support/">Mind</SupportLink>{" "}
                      <span className="text-slate-400">—</span> guidance and support for mental wellbeing
                    </li>

                    <li>
                      <SupportLink href="https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/">
                        NHS
                      </SupportLink>{" "}
                      <span className="text-slate-400">—</span> mental health advice and services
                    </li>
                  </ul>

                  <Inset tone="brand">
                    <p className="leading-7">
                      Preparation and support can help reduce unnecessary stress and make proceedings feel more
                      manageable.
                    </p>
                  </Inset>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- LIMITATIONS ---------- */}
        <section id="boundaries" className="border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div data-reveal>
              <SectionHeading>Limitations</SectionHeading>

              <Card className="mt-10 border-amber-200/70 bg-amber-50/40">
                <div className="flex gap-4">
                  <div className="hidden shrink-0 sm:block">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                      <Icon name="alert" />
                    </span>
                  </div>
                  <div className="text-sm leading-7 text-slate-700">
                    McKenzieFriend.ai is not a solicitor’s practice and does not provide regulated legal advice.
                    <br />
                    <br />
                    The AI is a preparation tool that can help organise information, improve clarity, and suggest
                    structure. It may be incomplete or incorrect and must be checked.
                    <br />
                    <br />
                    You are responsible for what you file, what you say, and the decisions you make. If you need legal
                    advice, consult a qualified professional.
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ---------- FEATURES ---------- */}
        <section id="features" className="border-t border-slate-200 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div data-reveal>
              <SectionHeading>What the dashboard helps you produce</SectionHeading>

              <div className="mt-10 grid gap-6 lg:grid-cols-3">
                <Card className="h-full">
                  <IconChip name="structure" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Clear structure</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Turn messy notes into headings, sections, and a consistent format you can keep updating.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <CheckItem>Issue list</CheckItem>
                    <CheckItem>Position summary</CheckItem>
                    <CheckItem>Key facts</CheckItem>
                  </ul>
                </Card>

                <Card className="h-full">
                  <IconChip name="timeline" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Chronologies &amp; timelines</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Build a timeline with dates, sources, and links to evidence so you can navigate quickly.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <CheckItem>Event log</CheckItem>
                    <CheckItem>Evidence pointers</CheckItem>
                    <CheckItem>Export-ready chronology</CheckItem>
                  </ul>
                </Card>

                <Card className="h-full">
                  <IconChip name="documents" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Document packs</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Organise documents with a simple structure, consistent naming, and an index template.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <CheckItem>Folder plan</CheckItem>
                    <CheckItem>Naming conventions</CheckItem>
                    <CheckItem>Index &amp; checklist</CheckItem>
                  </ul>
                </Card>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card className="h-full">
                  <IconChip name="draft" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Drafting helpers</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Prompt frameworks to help you draft and refine your own text for statements, schedules, and
                    summaries.
                  </p>
                  <Inset>
                    The AI can help with structure and clarity. You should verify accuracy, dates, and references before
                    using anything in a filing.
                  </Inset>
                </Card>

                <Card className="h-full">
                  <IconChip name="hearing" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Hearing preparation</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Build a practical plan for what to bring, what to say, and what to check—based on your own facts and
                    documents.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <CheckItem>Hearing-day checklist</CheckItem>
                    <CheckItem>Questions &amp; points to cover</CheckItem>
                    <CheckItem>Next-step task plan</CheckItem>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section id="how" className="border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div data-reveal>
              <SectionHeading>How it works</SectionHeading>

              <div className="mt-10 grid gap-6 lg:grid-cols-3">
                <StepCard step="Step 1" icon="workspace" numeral="1" title="Create your workspace">
                  Sign up to access your dashboard and start a case workspace with the sections you need.
                </StepCard>

                <StepCard step="Step 2" icon="input" numeral="2" title="Add your information">
                  Enter key dates, facts, and documents. The AI helps you shape them into structured outputs.
                </StepCard>

                <StepCard step="Step 3" icon="export" numeral="3" title="Export and refine">
                  Generate drafts, summaries, checklists, and indexes—then review and finalise in your own words.
                </StepCard>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <a href="/signup" className={btnDark}>
                  Create an account
                  <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <button onClick={() => scrollTo("privacy")} className={btnOutline}>
                  Privacy &amp; data
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- PRIVACY ---------- */}
        <section id="privacy" className="border-t border-slate-200 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div data-reveal>
              <SectionHeading>Privacy &amp; data</SectionHeading>

              <div className="mt-10 grid gap-6 lg:grid-cols-2">
                <Card className="h-full">
                  <IconChip name="shield" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Practical defaults</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Keep your workspace tidy and only add what is necessary for your preparation.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <CheckItem>Avoid uploading sensitive information unless required</CheckItem>
                    <CheckItem>Use initials where appropriate</CheckItem>
                    <CheckItem>Store your own copies of everything</CheckItem>
                  </ul>
                </Card>

                <Card className="h-full">
                  <IconChip name="eye" />
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">Transparency</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    For full details on handling and retention, refer to your product settings and policies once logged
                    in.
                  </p>
                  <div className="mt-6">
                    <a href="mailto:contact@mckenziefriend.ai" className={cn(btnOutline, "px-5")}>
                      Ask about data handling
                    </a>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- WHO ---------- */}
        <section id="who" className="border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div data-reveal>
              <SectionHeading>Who this is for</SectionHeading>

              <div className="mt-10 grid gap-6 lg:grid-cols-2">
                <Card className="h-full">
                  <IconChip name="users" />
                  <p className="mt-5 text-slate-700">
                    Litigants in person in the Civil &amp; Family Court of England &amp; Wales who want clearer
                    preparation, better organisation, and a repeatable workflow.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <CheckItem>You have lots of dates, messages, and documents</CheckItem>
                    <CheckItem>You want a clean chronology and evidence map</CheckItem>
                    <CheckItem>You want checklists and structured drafts</CheckItem>
                  </ul>
                </Card>

                <Card className="h-full">
                  <IconChip name="tool" />
                  <p className="mt-5 text-slate-700">
                    People who prefer a tool-based approach: work inside a dashboard, keep everything in one place, and
                    export outputs as you go.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    <CheckItem>Ongoing updates as your case evolves</CheckItem>
                    <CheckItem>Consistent headings and formatting</CheckItem>
                    <CheckItem>Faster prep for directions and hearings</CheckItem>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section id="cta" className="border-t border-slate-200 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div
              data-reveal
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-xl sm:p-12"
            >
              <div className="hero-grid absolute inset-0 pointer-events-none opacity-40" />
              <div className="relative">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Get started</h2>

                <p className="mt-4 max-w-xl text-white/80">
                  Create your account to access the dashboard. If you have questions before signing up, contact us.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="/signup" className={heroPrimaryBtn}>
                    Create an account
                    <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                  <a href="mailto:contact@mckenziefriend.ai" className={heroGhostBtn}>
                    Contact us
                  </a>
                </div>
              </div>
            </div>

<footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-600">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
    <span className="text-slate-500">England &amp; Wales</span>
  </div>
  <div className="mt-3 space-y-1 text-slate-500">
    <p>MCKENZIEFRIEND AI LTD</p>
    <p>Registered in England &amp; Wales · Company number 17362145</p>
  </div>
</footer>
          </div>
        </section>
      </div>

      {/* Back to top */}
      <button
        type="button"
        onClick={() => scrollTo("top")}
        aria-label="Back to top"
        className={cn(
          "fixed bottom-6 right-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
          scrolled ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        )}
      >
        <Icon name="arrowUp" />
      </button>
    </>
  );
}

/* ---------------- building blocks ---------------- */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="h-1 w-12 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{children}</h2>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

function Inset({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "brand";
}) {
  return (
    <div
      className={cn(
        "mt-6 rounded-xl p-5 text-sm leading-7",
        tone === "brand"
          ? "border border-sky-200 bg-sky-50/70 text-slate-700"
          : "border border-slate-200 bg-slate-50 text-slate-700"
      )}
    >
      {children}
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      <span>{children}</span>
    </li>
  );
}

function SupportLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-sky-700 underline decoration-sky-200 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 rounded-sm"
    >
      {children}
    </a>
  );
}

function StepCard({
  step,
  icon,
  numeral,
  title,
  children,
}: {
  step: string;
  icon: IconName;
  numeral: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="relative h-full">
      <div className="flex items-start justify-between">
        <IconChip name={icon} />
        <span className="select-none text-5xl font-bold leading-none text-slate-100" aria-hidden="true">
          {numeral}
        </span>
      </div>
      <div className="mt-6 text-xs font-semibold uppercase tracking-wider text-sky-600">{step}</div>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{children}</p>
    </Card>
  );
}

function IconChip({
  name,
  tone = "sky",
}: {
  name: IconName;
  tone?: "sky" | "indigo" | "rose" | "amber";
}) {
  const tones: Record<string, string> = {
    sky: "bg-sky-50 text-sky-600 ring-sky-100",
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };
  return (
    <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1", tones[tone])}>
      <Icon name={name} />
    </span>
  );
}

/* ---------------- icons (inline, no dependency) ---------------- */

type IconName =
  | "check"
  | "arrowRight"
  | "arrowUp"
  | "structure"
  | "timeline"
  | "documents"
  | "draft"
  | "hearing"
  | "workspace"
  | "input"
  | "export"
  | "shield"
  | "eye"
  | "users"
  | "tool"
  | "heart"
  | "lifebuoy"
  | "alert";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    check: <path d="M20 6 9 17l-5-5" />,
    arrowRight: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    arrowUp: (
      <>
        <path d="M12 19V5" />
        <path d="m6 11 6-6 6 6" />
      </>
    ),
    structure: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="3.5" cy="6" r="1.1" />
        <circle cx="3.5" cy="12" r="1.1" />
        <circle cx="3.5" cy="18" r="1.1" />
      </>
    ),
    timeline: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    documents: (
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    ),
    draft: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
      </>
    ),
    hearing: (
      <>
        <rect x="5" y="5" width="14" height="16" rx="2" />
        <path d="M9 5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
        <path d="m9 13 2 2 4-4" />
      </>
    ),
    workspace: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M12 11.5v5" />
        <path d="M9.5 14h5" />
      </>
    ),
    input: (
      <>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
        <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </>
    ),
    export: (
      <>
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    shield: <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6z" />,
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
        <path d="M18 14.2c2.05.8 3.5 2.8 3.5 5.1" />
      </>
    ),
    tool: (
      <>
        <line x1="4" y1="8" x2="20" y2="8" />
        <line x1="4" y1="16" x2="20" y2="16" />
        <circle cx="9" cy="8" r="2.3" />
        <circle cx="15" cy="16" r="2.3" />
      </>
    ),
    heart: (
      <path d="M12 20s-7-4.5-9.4-9C1.1 8 2.6 4.5 6 4.5c2 0 3.2 1 4 2 .8-1 2-2 4-2 3.4 0 4.9 3.5 3.4 6.5C19 15.5 12 20 12 20z" />
    ),
    lifebuoy: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="m5 5 4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 4.3 2.5 18a1.5 1.5 0 0 0 1.3 2.2h16.4A1.5 1.5 0 0 0 21.5 18L13.7 4.3a1.5 1.5 0 0 0-2.6 0z" />
        <line x1="12" y1="9.5" x2="12" y2="14" />
        <line x1="12" y1="17.2" x2="12" y2="17.3" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
