"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentProvider";

export default function CookieBanner() {
  const { ready, bannerOpen, focusOnOpen, consent, accept, reject, dismissBanner } = useConsent();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Move focus to the banner only when the user opened it deliberately from
  // "Cookie settings". On a first visit it is left in the page flow so it does
  // not yank focus away from whatever the visitor is reading.
  useEffect(() => {
    if (bannerOpen && focusOnOpen) containerRef.current?.focus();
  }, [bannerOpen, focusOnOpen]);

  useEffect(() => {
    if (!bannerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissBanner();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [bannerOpen, dismissBanner]);

  if (!ready || !bannerOpen) return null;

  return (
    // Deliberately non-modal: no focus trap and no scroll lock, so the page
    // stays fully readable and scrollable while the banner is open.
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 z-[9998] border-t border-slate-200 bg-white p-4 shadow-[0_-4px_20px_rgba(11,26,43,0.08)] outline-none focus-visible:ring-2 focus-visible:ring-[#88D2DC] sm:p-5 print:hidden"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 id="cookie-banner-title" className="text-sm font-semibold text-[#0B1A2B]">
            Cookies on McKenzieFriend.ai
          </h2>
          <p id="cookie-banner-description" className="mt-1 text-sm leading-6 text-slate-600">
            We use essential cookies to keep you signed in. We&apos;d also like to set optional
            analytics cookies to understand how the site is used. Analytics stay off unless you
            accept.{" "}
            <Link href="/cookies" className="font-semibold text-[#0B1A2B] underline underline-offset-2">
              Cookie Notice
            </Link>{" "}
            &middot;{" "}
            <Link href="/privacy" className="font-semibold text-[#0B1A2B] underline underline-offset-2">
              Privacy Notice
            </Link>
          </p>
          {consent ? (
            <p className="mt-1 text-xs text-slate-500">
              Your current choice: <strong>{consent === "accepted" ? "Accepted" : "Rejected"}</strong>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reject}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1A2B] transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1A2B]"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10243A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1A2B]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
