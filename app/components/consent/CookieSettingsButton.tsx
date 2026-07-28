"use client";

import { useConsent } from "./ConsentProvider";

/** Footer control that re-opens the banner so a choice can be changed or withdrawn. */
export default function CookieSettingsButton({ className = "" }: { className?: string }) {
  const { openSettings } = useConsent();

  return (
    <button
      type="button"
      onClick={openSettings}
      className={`rounded underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${className}`}
    >
      Cookie settings
    </button>
  );
}
