"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

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
   * Goal:
   * - Logo never squeezed/stretched: keep w-auto + h fixed, add min-width container so it can't be cramped.
   * - Buttons always visible on all devices: allow nav to wrap (2 rows on very small screens),
   *   keep tap targets, and prevent overflow.
   */

  const navBtn =
    "inline-flex items-center justify-center rounded-full font-semibold transition leading-none " +
    "whitespace-nowrap " +
    "px-3 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm";

  const inactive =
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50";

  const active =
    "border-transparent bg-[#0B1A2B] text-white hover:bg-[#0B1A2B]/95";

  const Logo = (
    <span
      className={
        // Reserve space so the logo stays fully visible and doesn't get compressed by the nav
        "relative block h-8 w-[140px] sm:w-[160px] md:w-[180px] " +
        "shrink-0"
      }
    >
      <Image
        src="/logo.png"
        alt="McKenzieFriend logo"
        fill
        priority
        sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, 180px"
        className="object-contain"
      />
    </span>
  );

  const BrandWrapperClasses =
    "group inline-flex shrink-0 items-center rounded-md px-2 py-1 hover:bg-zinc-50";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div
        className={
          // On tiny screens: stack brand + nav so nothing gets cramped.
          // From sm and up: one row.
          "mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 " +
          "sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6"
        }
      >
        {/* Brand */}
        {onHomeClick ? (
          <button
            onClick={onHomeClick}
            className={BrandWrapperClasses}
            aria-label="Go to home"
            type="button"
          >
            {Logo}
          </button>
        ) : (
          <a href="/" className={BrandWrapperClasses} aria-label="Go to home">
            {Logo}
          </a>
        )}

        {/* Nav */}
        <nav
          className={
            // Always show all buttons: allow wrapping (2 rows if needed),
            // never overflow off-screen, keep centered on mobile.
            "flex flex-wrap items-center justify-center gap-2 " +
            "whitespace-normal sm:justify-end"
          }
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
