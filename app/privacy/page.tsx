import type { Metadata } from "next";
import Link from "next/link";
import { DraftNotice, H2, LegalPage, LI, P, Placeholder, UL } from "../components/legal/LegalUI";

export const metadata: Metadata = {
  title: "Privacy Notice — McKenzieFriend.ai",
  description: "How McKenzieFriend.ai collects, uses and protects your personal data.",
};

const processors = [
  {
    provider: "Supabase",
    purpose: "Database, file storage, authentication",
    location: <Placeholder>[CONFIRM region — recommend London/EU]</Placeholder>,
  },
  {
    provider: "OpenAI",
    purpose: "Generates AI responses from the case content you submit",
    location: (
      <>
        <strong>United States</strong> — see below
      </>
    ),
  },
  { provider: "Vercel", purpose: "Website hosting", location: "May process outside the UK" },
  {
    provider: "Google Analytics",
    purpose: "Usage analytics (only with your consent)",
    location: "May process outside the UK",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Privacy"
      title="Privacy Notice"
      intro="How we collect, use and protect your personal data when you use McKenzieFriend.ai."
      updated="[date]"
    >
      <DraftNotice>
        <strong>DRAFT v1 — review before publishing.</strong> This is a genuine first version based
        on how the app actually handles data. The points marked <strong>[CONFIRM]</strong> need your
        input or specialist sign-off (as part of the DPIA). It is not a substitute for legal advice.
      </DraftNotice>

      <H2>1. Who we are</H2>
      <P>
        McKenzieFriend.ai is operated by <strong>MCKENZIEFRIEND AI LTD</strong> (&quot;we&quot;,
        &quot;us&quot;), the data controller for the personal data described here.
      </P>
      <UL>
        <LI>
          <strong>Contact for privacy matters:</strong> info@mckenziefriend.ai
        </LI>
        <LI>
          <strong>ICO registration reference:</strong>{" "}
          <Placeholder>[ADD — on your certificate, e.g. ZB123456]</Placeholder>
        </LI>
        <LI>
          <strong>Registered company:</strong> MCKENZIEFRIEND AI LTD{" "}
          <Placeholder>[ADD company number / registered address]</Placeholder>
        </LI>
      </UL>

      <H2>2. What this service is</H2>
      <P>
        McKenzieFriend.ai helps litigants-in-person in England and Wales organise and prepare their
        own court cases. <strong>It is not a law firm, does not provide regulated legal advice, and
        does not represent you.</strong> Its AI features are for preparation and organisation only,
        can be inaccurate, and must be checked by you.
      </P>

      <H2>3. The data we collect</H2>
      <UL>
        <LI>
          <strong>Account data:</strong> your email address and password (passwords are handled by
          our authentication provider and are not visible to us).
        </LI>
        <LI>
          <strong>Case data you enter:</strong> case details, chronologies, witness statements,
          calendar entries, bundle items, and messages you send to the AI assistant.
        </LI>
        <LI>
          <strong>Documents you upload:</strong> court orders, letters, evidence, screenshots,
          images.
        </LI>
        <LI>
          <strong>Analytics data:</strong> if you consent, basic usage analytics via Google
          Analytics (see the{" "}
          <Link href="/cookies" className="font-semibold text-zinc-900 underline underline-offset-2">
            Cookie Notice
          </Link>
          ).
        </LI>
      </UL>
      <P>
        <strong>Sensitive information.</strong> Case material often includes special category data
        (e.g. health, religious belief, sexual life) and information about alleged criminal conduct,
        and may include information about children and other people. Only include what you need for
        your case. By entering it, you understand it will be processed as described here, including
        being sent to our AI provider (section 5).
      </P>

      <H2>
        4. Why we use it, and our legal basis <Placeholder>[CONFIRM with DPIA]</Placeholder>
      </H2>
      <UL>
        <LI>
          <strong>To provide the service</strong> (create your workspace, store your case, generate
          drafts): legal basis — <strong>performance of a contract</strong> (UK GDPR Art. 6(1)(b)).
        </LI>
        <LI>
          <strong>For special category / criminal-allegation data</strong> within your case content:
          we rely on <strong>your explicit consent</strong> (Art. 9(2)(a)) and, where relevant, that
          processing is necessary for <strong>the establishment, exercise or defence of legal
          claims</strong> (Art. 9(2)(f) / DPA 2018 Sch. 1).{" "}
          <Placeholder>[CONFIRM — specialist to verify]</Placeholder>
        </LI>
        <LI>
          <strong>For analytics:</strong> legal basis — <strong>consent</strong> (Art. 6(1)(a)),
          which you can withdraw at any time.
        </LI>
      </UL>

      <H2>5. Who we share it with (our processors)</H2>
      <P>
        We do not sell your data. We share it only with service providers who process it on our
        instructions:
      </P>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th scope="col" className="px-4 py-3">Provider</th>
              <th scope="col" className="px-4 py-3">Purpose</th>
              <th scope="col" className="px-4 py-3">Location / transfer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-700">
            {processors.map((row) => (
              <tr key={row.provider}>
                <th scope="row" className="px-4 py-3 font-semibold text-zinc-900">
                  {row.provider}
                </th>
                <td className="px-4 py-3 leading-6">{row.purpose}</td>
                <td className="px-4 py-3 leading-6">{row.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        <strong>AI processing (important).</strong> When you use the AI assistant, the relevant case
        content is sent to <strong>OpenAI</strong> to generate a response. This is necessary to
        provide the feature. OpenAI processes this in the United States.{" "}
        <Placeholder>
          [CONFIRM: the international transfer safeguard — UK IDTA / SCCs / adequacy — and whether an
          OpenAI zero-retention / no-training arrangement is in place.]
        </Placeholder>
      </P>

      <H2>
        6. International transfers <Placeholder>[CONFIRM]</Placeholder>
      </H2>
      <P>
        Some providers process data outside the UK. Where they do, we rely on appropriate safeguards
        (e.g. UK International Data Transfer Agreement or an adequacy decision). [Specialist to
        confirm the exact mechanism for each provider.]
      </P>

      <H2>7. How long we keep it</H2>
      <UL>
        <LI>
          <strong>Case data and uploads:</strong> until you delete them or close your account;
          deleted within <strong>30 days</strong> of account closure.
        </LI>
        <LI>
          <strong>Account/login data:</strong> kept while your account is active; removed when you
          delete your account.
        </LI>
        <LI>
          <strong>Analytics data:</strong> retained for <strong>14 months</strong>.
        </LI>
      </UL>

      <H2>8. Your rights</H2>
      <P>
        Under UK data protection law you can: access your data; correct it; delete it; restrict or
        object to processing; request portability; and withdraw consent at any time. To exercise any
        right, email <strong>info@mckenziefriend.ai</strong>. You can also complain to the ICO
        (ico.org.uk), though we&apos;d appreciate the chance to help first.
      </P>
      <P>You can delete your case data and account yourself from within the app at any time.</P>

      <H2>9. Security</H2>
      <P>
        Data is stored with access controls so that only your account can reach your cases. Files are
        held in private storage. No system is perfectly secure, but we take reasonable measures to
        protect your information.
      </P>

      <H2>10. Children</H2>
      <P>
        The service is intended for adults (18+) preparing their own cases. It is not directed at
        children. Case content may refer to children as subjects of proceedings; that information is
        processed as part of your case as described above.
      </P>

      <H2>11. Changes</H2>
      <P>
        We may update this notice. Material changes will be reflected here with a new &quot;last
        updated&quot; date.
      </P>
    </LegalPage>
  );
}
