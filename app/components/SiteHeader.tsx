"use client";

import { usePathname } from "next/navigation";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

type Props = {
  /** Optional: for home page only, let logo scroll to top instead of navigating */
  onHomeClick?: () => void;
};

export default function SiteHeader({ onHomeClick }: Props) {
  const pathname = usePathname();

  const NAVY = "bg-[#0B1A2B] hover:bg-[#0B1A2B]/95";

  const baseBtn =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition " +
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50";

  const activeBtn = cn(
    "border-transparent text-white",
    NAVY
  );

  const isHome = pathname === "/";
  const isAbout = pathname === "/about";
  const isContact = pathname === "/contact";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / logo */}
        {onHomeClick ? (
          <button
            onClick={onHomeClick}
            className="group inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </button>
        ) : (
          <a
            href="/"
            className="group inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </a>
        )}

        {/* Nav */}
        <nav className="flex items-center gap-2">
          <a href="/" className={cn(baseBtn, isHome && activeBtn)} aria-current={isHome ? "page" : undefined}>
            Home
          </a>

          <a href="/about" className={cn(baseBtn, isAbout && activeBtn)} aria-current={isAbout ? "page" : undefined}>
            About
          </a>

          <a href="/contact" className={cn(baseBtn, isContact && activeBtn)} aria-current={isContact ? "page" : undefined}>
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
