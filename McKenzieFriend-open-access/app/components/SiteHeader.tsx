"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NextImage from "next/image";
import { createClient } from "@/lib/supabase/browser";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

type Props = {
  onHomeClick?: () => void;
};

export default function SiteHeader({ onHomeClick }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean>(false);

  const isHome = pathname === "/";
  const isAbout = pathname === "/about";
  const isContact = pathname === "/contact";

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Track auth state (client-side)
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setSignedIn(!!data.user);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSignedIn(!!session?.user);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /**
   * Shared button base (nav + auth)
   * Keeps sizing consistent across the header.
   */
  const navBtn =
    "inline-flex items-center justify-center rounded-full font-semibold transition whitespace-nowrap leading-none " +
    "px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-sm";

  const inactive =
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50";

  const active =
    "border-transparent bg-[#0B1A2B] text-white hover:bg-[#0B1A2B]/95";

  // Auth buttons: prominent but same “family” as nav pills
  const authPrimary = cn(
    navBtn,
    "border border-transparent bg-[#0C1A2B] text-white hover:bg-[#16263D] shadow-sm"
  );

  const authSecondary = cn(
    navBtn,
    "border border-[#0C1A2B] text-[#0C1A2B] bg-white hover:bg-zinc-50"
  );

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

  const DesktopAuth = useMemo(() => {
    if (signedIn) {
      return (
        <a href="/dashboard" className={authPrimary}>
          Your Dashboard
        </a>
      );
    }

    return (
      <>
        <a href="/login" className={authSecondary}>
          Log in
        </a>
        <a href="/signup" className={authPrimary}>
          Sign up
        </a>
      </>
    );
  }, [signedIn, authPrimary, authSecondary]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      {/* Desktop uses 3-column grid so nav is truly centered */}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between sm:grid sm:grid-cols-3 sm:items-center">
          {/* Left: Brand */}
          <div className="flex items-center sm:justify-start">
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
          </div>

          {/* Center: Desktop Nav (truly centered) */}
          <nav
            className="hidden sm:flex items-center justify-center gap-2"
            aria-label="Primary"
          >
            <NavLinks />
          </nav>

          {/* Right: Desktop Auth */}
          <div className="hidden sm:flex items-center justify-end gap-2">
            {DesktopAuth}
          </div>

          {/* Mobile hamburger (shown only on mobile) */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white p-2 text-zinc-800 hover:bg-zinc-50"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((v) => !v)}
            >
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
            {/* Mobile auth row (two-column, cleaner) */}
            <div className="grid grid-cols-2 gap-2 pb-2">
              {signedIn ? (
                <a
                  href="/dashboard"
                  className={cn(authPrimary, "col-span-2 w-full")}
                  onClick={() => setMobileOpen(false)}
                >
                  Your Dashboard
                </a>
              ) : (
                <>
                  <a
                    href="/signup"
                    className={cn(authPrimary, "w-full")}
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign up
                  </a>
                  <a
                    href="/login"
                    className={cn(authSecondary, "w-full")}
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
                  </a>
                </>
              )}
            </div>

            {/* Mobile nav links */}
            <NavLinks mobile />
          </div>
        </nav>
      </div>
    </header>
  );
}
