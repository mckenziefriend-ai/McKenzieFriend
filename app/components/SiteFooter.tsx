import Link from "next/link";
import CookieSettingsButton from "./consent/CookieSettingsButton";

/**
 * Slim legal bar rendered from the root layout, so the policy links and the
 * consent control are present on the marketing pages and the dashboard alike.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-600 print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <span>&copy; {new Date().getFullYear()} McKenzieFriend.ai</span>
        <nav aria-label="Legal and privacy" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/privacy" className="rounded underline-offset-2 hover:underline">
            Privacy
          </Link>
          <Link href="/cookies" className="rounded underline-offset-2 hover:underline">
            Cookies
          </Link>
          <CookieSettingsButton />
        </nav>
      </div>
    </footer>
  );
}
