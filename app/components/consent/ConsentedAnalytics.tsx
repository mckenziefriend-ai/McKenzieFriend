"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useConsent } from "./ConsentProvider";

/**
 * Google Analytics, gated on consent.
 *
 * GA is mounted only when BOTH are true:
 *   1. NEXT_PUBLIC_GA_ID is configured, and
 *   2. the user has actively accepted analytics cookies.
 *
 * Until then nothing is rendered, so no gtag script is requested and no
 * analytics cookies are set. `consent` starts as null (not yet chosen), which
 * is treated exactly like "rejected".
 */
export default function ConsentedAnalytics({ gaId }: { gaId?: string }) {
  const { consent } = useConsent();

  if (!gaId) return null;
  if (consent !== "accepted") return null;

  return <GoogleAnalytics gaId={gaId} />;
}
