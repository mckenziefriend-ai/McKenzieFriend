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

  // Comfortable tap size mobile, normal desktop
  const navBtn =
    "inline-flex items-center justify-center rounded-full font-semibold transition leading-none whitespace-nowrap " +
    "px-3 py-1.5 text-sm sm:px-4 sm:py-2";

  const inactive =
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50";

  const active =
    "border-transparent bg-[#0B1A2B] text-white hover:bg-[#0B1A2B]/95";

  /**
   * LOGO RULES (this fixes everything):
   * - Fixed visual height across devices
   * - Width auto (keeps proportions)
   * - Never shrinks
   * - Never grows huge
   */
  const Logo = (
    <NextImage
      src="/logo.png"
      alt="McKenzieFriend logo"
      width={220}
      height={60}
      priority
      className="h-[28px] w-auto object-contain shrink-0"
    />
  );

  const BrandClasses =
    "group inline-flex flex-none items-center rounded-md px-1 py-1 hover:bg-zinc-50";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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

        {/* Nav — forced single row */}
        <nav className="flex flex-none flex-nowrap items-center gap-2" aria-label="Primary">
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
