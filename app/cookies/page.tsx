import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice, H2, H3, LegalPage, LI, P, UL } from "../components/legal/LegalUI";

export const metadata: Metadata = {
  title: "Cookie Notice — McKenzieFriend.ai",
  description: "How McKenzieFriend.ai uses cookies, and how to change your choice.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      kicker="Cookies"
      title="Cookie Notice"
      intro="We keep cookies to a minimum. Analytics cookies are off unless you accept them."
      updated="[date]"
    >
      <DraftNotice>
        <strong>DRAFT v1 — review before publishing.</strong>
      </DraftNotice>

      <H2>What cookies we use</H2>
      <P>We keep cookies to a minimum and split them into two groups.</P>

      <H3>Strictly necessary (always on)</H3>
      <P>These are required for the site to work and do not need consent:</P>
      <UL>
        <LI>
          <strong>Authentication / session cookies</strong> (via Supabase) — keep you securely
          logged in and maintain your session.
        </LI>
        <LI>
          <strong>Consent preference</strong> — remembers your cookie choice so we don&apos;t ask
          every visit.
        </LI>
      </UL>

      <H3>Analytics (only with your consent)</H3>
      <UL>
        <LI>
          <strong>Google Analytics</strong> — helps us understand how the site is used so we can
          improve it. These load <strong>only if you accept</strong> on the cookie banner. If you
          reject, no analytics cookies are set and no analytics data is collected.
        </LI>
      </UL>

      <H2>Your choice</H2>
      <P>
        When you first visit, a banner lets you <strong>Accept</strong> or <strong>Reject</strong>{" "}
        non-essential cookies. The default is <strong>reject</strong> — nothing non-essential runs
        until you opt in. You can change your choice at any time via the{" "}
        <strong>&quot;Cookie settings&quot;</strong> link in the footer.
      </P>

      <H2>More information</H2>
      <P>
        For how we handle personal data generally, see our{" "}
        <Link href="/privacy" className="font-semibold text-zinc-900 underline underline-offset-2">
          Privacy Notice
        </Link>
        . Questions: <strong>info@mckenziefriend.ai</strong>.
      </P>
    </LegalPage>
  );
}
