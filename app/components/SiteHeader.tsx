"use client";

import { usePathname } from "next/navigation";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

type Props = {
  onHomeClick?: () => void;
};

export default function SiteHeader({ onHomeClick }: Props) {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isAbout = pathname === "/about";
  const isContact = pathname === "/contact";

  // Responsive button sizing so all 3 fit on a single row on mobile + desktop
  const navBtn =
    "inline-flex items-center justify-center rounded-full font-semibold transition whitespace-nowrap leading-none " +
    "px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm";

  const inactive =
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50";

  const active =
    "border-transparent bg-[#0B1A2B] text-white hover:bg-[#0B1A2B]/95";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        {/* Brand */}
        {onHomeClick ? (
          <button
            onClick={onHomeClick}
            className="group inline-flex min-w-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50"
            aria-label="Go to home"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            {/* Truncate brand text so it never forces nav to wrap on small screens */}
            <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </button>
        ) : (
          <a
            href="/"
            className="group inline-flex min-w-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50"
            aria-label="Go to home"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </a>
        )}

        {/* Nav: always one row on mobile + desktop */}
        <nav
          className="flex flex-none items-center gap-1 whitespace-nowrap sm:gap-2"
          aria-label="Primary"
        >
          <a
            href="/"
            className={cn(navBtn, isHome ? active : inactive)}
            aria-current={isHome ? "page" : undefined}
          >
            Home
          </a>

          <a
            href="/about"
            className={cn(navBtn, isAbout ? active : inactive)}
            aria-current={isAbout ? "page" : undefined}
          >
            About
          </a>

          <a
            href="/contact"
            className={cn(navBtn, isContact ? active : inactive)}
            aria-current={isContact ? "page" : undefined}
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
