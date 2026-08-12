import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

type Helpline = {
  name: string;
  number: string;
  tel: string;
  detail: string;
};

type HelplineGroup = {
  heading: string;
  lines: Helpline[];
};

// NOTE: this list is safety-critical, user-facing content. The numbers below are
// well-known UK helplines, but they should be reviewed and kept current by a
// person before and after launch — helpline numbers and hours do change.
const GROUPS: HelplineGroup[] = [
  {
    heading: "If you feel unable to cope, or you're having thoughts of suicide",
    lines: [
      {
        name: "Samaritans",
        number: "116 123",
        tel: "116123",
        detail: "Free, any time, day or night. You don't have to be suicidal to call.",
      },
      {
        name: "NHS urgent help",
        number: "111",
        tel: "111",
        detail: "Call 111 and select the mental health option for urgent NHS support.",
      },
    ],
  },
  {
    heading: "Domestic abuse",
    lines: [
      {
        name: "National Domestic Abuse Helpline (Refuge)",
        number: "0808 2000 247",
        tel: "08082000247",
        detail: "Free, 24 hours a day, run by Refuge. Support and a safe space to talk.",
      },
    ],
  },
  {
    heading: "Children and young people",
    lines: [
      {
        name: "Childline",
        number: "0800 1111",
        tel: "08001111",
        detail: "Free, confidential support for anyone under 19.",
      },
    ],
  },
  {
    heading: "Housing and practical support",
    lines: [
      {
        name: "Shelter",
        number: "0808 800 4444",
        tel: "08088004444",
        detail: "Free housing advice if you are homeless or at risk of losing your home.",
      },
    ],
  },
];

export default async function CaseSupportPage({
  params,
}: {
  params: Promise<{ caseid: string }>;
}) {
  const { caseid: caseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id,title")
    .eq("id", caseId)
    .eq("user_id", user.id)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Support">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 md:px-8 md:py-7">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Support &amp; helplines</h2>
          <p className="mt-1 text-sm text-slate-600">
            McKenzie Friend AI can help with your case, but it isn&rsquo;t a counsellor or a crisis
            service. If things feel like too much, these are real people who can help.
          </p>
        </div>

        {/* Emergency banner */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="text-sm font-semibold text-rose-800">
            If you are in immediate danger, call 999 now.
          </div>
          <p className="mt-1 text-sm text-rose-700">
            For situations that are urgent but not an emergency, you can call the police on{" "}
            <a href="tel:101" className="font-semibold underline">
              101
            </a>
            .
          </p>
        </div>

        {GROUPS.map((group) => (
          <div
            key={group.heading}
            className="border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="text-sm font-semibold text-[#0B1A2B]">{group.heading}</div>
            <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {group.lines.map((line) => (
                <div
                  key={line.name}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0B1A2B]">{line.name}</div>
                    <div className="mt-0.5 text-xs text-slate-600">{line.detail}</div>
                  </div>
                  <a
                    href={`tel:${line.tel}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
                  >
                    {line.number}
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-slate-500">
          These lines are free to call. If you are worried about someone else, you can call on their
          behalf.
        </p>
      </div>
    </CaseWorkspaceShell>
  );
}
