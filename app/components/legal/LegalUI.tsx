import type { ReactNode } from "react";
import SiteHeader from "../SiteHeader";

/** Shared shell + typography for the policy pages, styled to match the site. */
export function LegalPage({
  kicker,
  title,
  intro,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  intro?: ReactNode;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <SiteHeader />

      <section className="hero-surface relative overflow-hidden">
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="hero-glow absolute inset-0 pointer-events-none" />

        <div className="mx-auto max-w-3xl px-4 py-16 text-white sm:px-6">
          <p className="text-xs font-semibold text-white/60">{kicker}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {intro ? <p className="mt-5 text-base leading-7 text-white/80">{intro}</p> : null}
          <p className="mt-5 text-xs text-white/60">Last updated: {updated}</p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">{children}</div>
      </section>
    </main>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-12 scroll-mt-24 text-xl font-semibold tracking-tight text-zinc-900 first:mt-0 sm:text-2xl">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 text-base font-semibold text-zinc-900">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[15px] leading-7 text-zinc-700">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mt-4 space-y-2.5 text-[15px] leading-7 text-zinc-700">{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}
