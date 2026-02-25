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

  const navBtn =
    "inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition whitespace-nowrap";

  const inactive =
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50";

  const active =
    "border-transparent bg-[#0B1A2B] text-white hover:bg-[#0B1A2B]/95";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        {/* Row 1: Brand */}
        <div className="flex items-center justify-between">
          {onHomeClick ? (
            <button
              onClick={onHomeClick}
              className="group inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50"
              aria-label="Go to home"
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
              aria-label="Go to home"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
                MF
              </span>
              <span className="text-sm font-semibold tracking-tight">
                McKenzieFriend<span className="text-zinc-500">.ai</span>
              </span>
            </a>
          )}
        </div>

        {/* Row 2: Nav (mobile scroll) */}
        <nav
          className={cn(
            "mt-3 flex items-center gap-2 overflow-x-auto pb-1",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "sm:mt-0 sm:justify-end sm:overflow-visible sm:pb-0"
          )}
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
