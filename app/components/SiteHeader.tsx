"use client";

import { useEffect, useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = pathname === "/";
  const isAbout = pathname === "/about";
  const isContact = pathname === "/contact";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /**
   * Buttons
   * - Mobile: compact but readable
   * - Desktop: normal
   */
  const navBtn =
    "inline-flex items-center justify-center rounded-full font-semibold transition whitespace-nowrap leading-none " +
    "px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-sm";

  const inactive =
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50";

  const active =
    "border-transparent bg-[#0B1A2B] text-white hover:bg-[#0B1A2B]/95";

  /**
   * Logo
   * - Smaller on mobile so everything fits nicely
   * - Normal size on desktop
   * - Always keeps proportions
   */
  const Logo = (
    <NextImage
      src="/logo.png"
      alt="McKenzieFriend logo"
      width={180}
      height={48}
      priority
      className="h-[20px] sm:h-[28px] w-auto object-contain shrink-0"
    />
  );

  const BrandClasses =
    "group inline-flex flex-none items-center rounded-md px-1 py-1 hover:bg-zinc-50";

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <a
        href="/"
        className={cn(
          navBtn,
          isHome ? active : inactive,
          mobile && "w-full justify-start"
        )}
        aria-current={isHome ? "page" : undefined}
        onClick={() => mobile && setMobileOpen(false)}
      >
        Home
      </a>

      <a
        href="/about"
        className={cn(
          navBtn,
          isAbout ? active : inactive,
          mobile && "w-full justify-start"
        )}
        aria-current={isAbout ? "page" : undefined}
        onClick={() => mobile && setMobileOpen(false)}
      >
        About
      </a>

      <a
        href="/contact"
        className={cn(
          navBtn,
          isContact ? active : inactive,
          mobile && "w-full justify-start"
        )}
        aria-current={isContact ? "page" : undefined}
        onClick={() => mobile && setMobileOpen(false)}
      >
        Contact
      </a>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        {onHomeClick ? (
          <button
            onClick={() => {
              setMobileOpen(false);
              onHomeClick();
            }}
            className={BrandClasses}
            aria-label="Go to home"
            type="button"
          >
            {Logo}
          </button>
        ) : (
          <a
            href="/"
            className={BrandClasses}
            aria-label="Go to home"
            onClick={() => setMobileOpen(false)}
          >
            {Logo}
          </a>
        )}

        {/* Desktop Nav */}
        <nav
          className="hidden sm:flex flex-none flex-nowrap items-center gap-2"
          aria-label="Primary"
        >
          <NavLinks />
        </nav>

        {/* Mobile hamburger (buttons hidden on mobile, shown in menu) */}
        <div className="sm:hidden flex items-center">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white p-2 text-zinc-800 hover:bg-zinc-50"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {/* Hamburger / Close icon */}
            {mobileOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        id="mobile-nav"
        className={cn(
          "sm:hidden overflow-hidden border-t border-zinc-200 bg-white/95 backdrop-blur",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <nav
          aria-label="Mobile Primary"
          className="mx-auto max-w-7xl px-4 py-3 sm:px-6"
        >
          <div className="flex flex-col gap-2">
            <NavLinks mobile />
          </div>
        </nav>
      </div>
    </header>
  );
}
