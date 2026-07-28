// Cookie-consent storage helpers.
//
// The consent cookie itself is "strictly necessary" (it only remembers the
// user's choice), so it is set regardless of the choice made — see the Cookie
// Notice. Everything non-essential stays off until consent === "accepted".

export const CONSENT_COOKIE = "mf_cookie_consent";
const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // 6 months

export type ConsentValue = "accepted" | "rejected";

/** Reads the stored choice. `null` means the user has not chosen yet. */
export function readConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;

  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];

  return raw === "accepted" || raw === "rejected" ? raw : null;
}

export function writeConsent(value: ConsentValue) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/**
 * Best-effort removal of Google Analytics cookies when consent is withdrawn.
 * GA sets these on variations of the host, so we clear each candidate domain.
 * Any it cannot reach expire on their own; GA is not loaded again regardless.
 */
export function clearAnalyticsCookies() {
  if (typeof document === "undefined") return;

  const host = window.location.hostname;
  const parts = host.split(".");
  const domains: (string | null)[] = [null, host, `.${host}`];
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join(".")}`);

  for (const entry of document.cookie.split("; ")) {
    const name = entry.split("=")[0];
    if (!/^_(ga|gid|gat)/.test(name)) continue;

    for (const domain of domains) {
      document.cookie =
        `${name}=; Path=/; Max-Age=0; SameSite=Lax` +
        (domain ? `; Domain=${domain}` : "");
    }
  }
}
