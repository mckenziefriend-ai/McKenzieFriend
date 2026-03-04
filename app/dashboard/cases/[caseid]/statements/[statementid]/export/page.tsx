import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/app/dashboard/components/PrintButton";

export const dynamic = "force-dynamic";

function upperOrEmpty(s?: string | null) {
  const v = (s ?? "").trim();
  return v ? v.toUpperCase() : "";
}

export default async function StatementExportPage({
  params,
}: {
  params: Promise<{ caseid: string; statementid: string }>;
}) {
  const { caseid: caseId, statementid } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_private_beta")
    .eq("id", user.id)
    .single();
  if (!profile?.is_private_beta) redirect("/");

  const cookieStore = await cookies();
  const unlocked = cookieStore.get("chrono_unlocked")?.value === "1";
  if (!unlocked) redirect("/dashboard");

  const { data: caseRow } = await supabase
    .from("cases")
    .select(
      "id,title,court_name,case_number,applicant,respondent,proceedings_heading,proceedings_lines"
    )
    .eq("id", caseId)
    .single();
  if (!caseRow) redirect("/dashboard/cases");

  const { data: st } = await supabase
    .from("case_statements")
    .select("id,title,statement_by,statement_date,body")
    .eq("id", statementid)
    .eq("case_id", caseId)
    .single();
  if (!st) redirect(`/dashboard/cases/${caseId}/statements`);

  const proceedingsLines =
    String(caseRow.proceedings_lines ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const statementDate =
    st.statement_date
      ? new Date(st.statement_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "";

  const bodyParas =
    String(st.body ?? "")
      .split("\n")
      .map((p) => p.trimEnd())
      .filter((p) => p.trim().length > 0) ?? [];

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 16mm; }
        }
      `}</style>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        {/* Screen-only controls */}
        <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Export preview
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              Use Print to save as PDF.
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
              <div className="font-semibold text-zinc-900">
                Before you export
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Check spelling, names, dates.</li>
                <li>Keep it factual and specific.</li>
                <li>This tool drafts; it is not legal advice.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <PrintButton />
            <Link
              href={`/dashboard/cases/${caseId}/statements/${statementid}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Court-style heading */}
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm print:shadow-none sm:p-8">
          <div className="text-xs font-semibold text-zinc-700">
            {upperOrEmpty(caseRow.court_name ? `IN THE ${caseRow.court_name}` : "")}
          </div>

          {caseRow.proceedings_heading ? (
            <div className="mt-4 text-[11px] font-semibold text-zinc-700">
              {upperOrEmpty(caseRow.proceedings_heading)}
            </div>
          ) : null}

          {proceedingsLines.length > 0 ? (
            <div className="mt-2 space-y-1 text-[11px] text-zinc-700">
              {proceedingsLines.map((line, i) => (
                <div key={`${line}-${i}`}>{upperOrEmpty(line)}</div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 text-[11px] text-zinc-700">
            {caseRow.case_number ? (
              <div>
                <span className="font-semibold">Case Number:</span>{" "}
                {caseRow.case_number}
              </div>
            ) : null}
          </div>

          <div className="mt-4 text-center text-[11px] font-semibold text-zinc-700">
            BETWEEN
          </div>

          <div className="mt-3 text-center text-sm text-zinc-900">
            <div className="font-semibold">{caseRow.applicant ?? ""}</div>
            <div className="text-xs text-zinc-700">Applicant</div>

            <div className="mt-2 text-xs text-zinc-700">-and-</div>

            <div className="mt-2 font-semibold">{caseRow.respondent ?? ""}</div>
            <div className="text-xs text-zinc-700">Respondent</div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-sm font-bold tracking-tight text-zinc-900">
              WITNESS STATEMENT
            </div>
            <div className="mt-1 text-xs text-zinc-700">{st.title}</div>
          </div>

          {st.statement_by || statementDate ? (
            <div className="mt-4 text-xs text-zinc-700">
              {st.statement_by ? (
                <div>
                  <span className="font-semibold text-zinc-900">By:</span>{" "}
                  {st.statement_by}
                </div>
              ) : null}
              {statementDate ? (
                <div className="mt-1">
                  <span className="font-semibold text-zinc-900">Dated:</span>{" "}
                  {statementDate}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Body */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm print:shadow-none sm:p-8">
          <div className="space-y-4 text-sm leading-7 text-zinc-900">
            {bodyParas.length > 0 ? (
              bodyParas.map((p, idx) => <p key={idx}>{p}</p>)
            ) : (
              <p className="text-zinc-600">No content.</p>
            )}
          </div>

          <div className="mt-10 text-sm text-zinc-900">
            <div className="font-semibold">Statement of Truth</div>
            <div className="mt-2">
              I believe that the facts stated in this witness statement are true.
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-zinc-700">Signed</div>
                <div className="mt-6 border-b border-zinc-300" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-700">Dated</div>
                <div className="mt-6 border-b border-zinc-300" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
