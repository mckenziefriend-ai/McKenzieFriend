"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAnalyticsCookies,
  readConsent,
  writeConsent,
  type ConsentValue,
} from "@/lib/consent";

type ConsentContextValue = {
  /** `null` until the user has made a choice. Treated as "rejected" everywhere. */
  consent: ConsentValue | null;
  /** True once the stored choice has been read on the client. */
  ready: boolean;
  bannerOpen: boolean;
  /** Set when the banner was opened deliberately, so it can take focus. */
  focusOnOpen: boolean;
  accept: () => void;
  reject: () => void;
  openSettings: () => void;
  dismissBanner: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) throw new Error("useConsent must be used inside ConsentProvider");
  return context;
}

export default function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [ready, setReady] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [focusOnOpen, setFocusOnOpen] = useState(false);

  // Read the stored choice after mount. It cannot be read during render: the
  // server has no `document`, so a lazy initialiser would hydrate-mismatch.
  // Until this runs, `consent` stays null and nothing non-essential loads.
  useEffect(() => {
    const stored = readConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(stored);
    setReady(true);
    if (!stored) setBannerOpen(true);
  }, []);

  const accept = useCallback(() => {
    writeConsent("accepted");
    setConsent("accepted");
    setBannerOpen(false);
    setFocusOnOpen(false);
  }, []);

  const reject = useCallback(() => {
    writeConsent("rejected");
    // Withdrawing consent: drop any analytics cookies already set.
    clearAnalyticsCookies();
    setConsent("rejected");
    setBannerOpen(false);
    setFocusOnOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    setBannerOpen(true);
    setFocusOnOpen(true);
  }, []);

  // Closing without choosing leaves the default (rejected) in place and stores
  // nothing, so the banner is shown again on a later visit.
  const dismissBanner = useCallback(() => {
    setBannerOpen(false);
    setFocusOnOpen(false);
  }, []);

  const value = useMemo(
    () => ({ consent, ready, bannerOpen, focusOnOpen, accept, reject, openSettings, dismissBanner }),
    [consent, ready, bannerOpen, focusOnOpen, accept, reject, openSettings, dismissBanner]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}
