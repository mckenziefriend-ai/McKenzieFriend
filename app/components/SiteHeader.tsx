"use client";

import { usePathname } from "next/navigation";
import NextImage from "next/image";

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

  /**
   * Goals:
   * - Logo always fully visible (no stretch/squeeze): w-auto + fixed height, object-contain.
   * - Desktop logo not huge: cap at a moderate height.
   * - Mobile buttons not tiny, but still fit in ONE row: use tight but readable sizing,
   *   and prevent header from wrapping.
   */

  // Mobile: readable but compact; Desktop: normal.
  const navBtn =
    "inline-flex items-center justify-center rounded-full font-semibold transition leading-none whitespace-nowrap " +
    "px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm";

  const inactive =
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50";

  const active =
    "border-transparent bg-[#0B1A2B] text-white hover:bg-[#0B1A2B]/95";

  // Keep logo fully visible and reasonably sized across breakpoints.
  // Mobile slightly smaller so nav fits; desktop capped so it doesn't get huge.
  const Logo = (
    <NextImage
      src="/logo.png"
      alt="McKenzieFriend logo"
      width={200}
      height={48}
      priority
      className="h-7 w-auto object-contain sm:h-8 md:h-9"
    />
  );

  const BrandClasses =
    "group inline-flex flex-none items-center rounded-md px-1 py-1 hover:bg-zinc-50";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
        {/* Brand */}
        {onHomeClick ? (
          <button
            onClick={onHomeClick}
            className={BrandClasses}
            aria-label="Go to home"
            type="button"
          >
            {Logo}
          </button>
        ) : (
          <a href="/" className={BrandClasses} aria-label="Go to home">
            {Logo}
          </a>
        )}

        {/* Nav: single row always */}
        <nav
          className="flex flex-none flex-nowrap items-center gap-1.5 whitespace-nowrap sm:gap-2"
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
