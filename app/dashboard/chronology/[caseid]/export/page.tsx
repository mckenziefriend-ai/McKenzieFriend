import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "../../components/PrintButton";
import ExportHeaderFields from "../../components/ExportHeaderFields";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  event_date: string | null;
  date_unknown: boolean | null;
  summary: string;
  evidence: string | null;
  created_at: string | null;
};

function formatDateUK(dateISO: string) {
  return new Date(dateISO).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ExportChronologyPage({
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
    .select("id,title,created_at")
    .eq("id", caseId)
    .single();
  if (!caseRow) redirect("/dashboard/chronology");

  const { data: events } = await supabase
    .from("case_events")
    .select("id,event_date,date_unknown,summary,evidence,created_at")
    .eq("case_id", caseId);

  const rows = (events as EventRow[] | null) ?? [];

  const dated = rows
    .filter((r) => !r.date_unknown && r.event_date)
    .slice()
    .sort((a, b) => {
      if (a.event_date! < b.event_date!) return -1;
      if (a.event_date! > b.event_date!) return 1;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });

  const undated = rows
    .filter((r) => r.date_unknown || !r.event_date)
    .slice()
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          .print-only { display: block !important; }
          body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 16mm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }

          /* Page numbers */
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            font-size: 10px;
            color: #71717a;
          }
          .print-footer .page::after {
            content: "Page " counter(page) " of " counter(pages);
          }
        }
        .print-only { display: none; }
      `}</style>

      {/* Print footer (only shows on print) */}
      <div className="print-footer print-only">
        <div className="flex items-center justify-between">
          <div>Chronology</div>
          <div className="page" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        {/* Screen controls + disclaimers (NOT printed) */}
        <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Export preview
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              Use Print to save as PDF.
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700">
              <div className="font-semibold text-zinc-900">Before you export</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Check spelling, dates, and names carefully.</li>
                <li>Keep language factual and specific.</li>
                <li>
                  This tool helps draft documents and is not a substitute for
                  legal advice.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <PrintButton />
            <Link
              href={`/dashboard/chronology/${caseId}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Formal court caption (prints) + optional inputs (screen) */}
        <div className="mt-6">
          <ExportHeaderFields />
        </div>

        {/* Print-facing title (clean, court-like) */}
        <div className="mt-6">
          <div className="text-center font-bold tracking-tight text-zinc-900">
            CHRONOLOGY
          </div>
          <div className="mt-1 text-center text-sm text-zinc-700">
            {caseRow.title}
          </div>
        </div>

        {/* Dated */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-900">Dated events</h2>

          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm print:shadow-none">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs font-semibold text-zinc-700">
                  <th className="w-[56px] border-b border-zinc-200 px-4 py-3">
                    No.
                  </th>
                  <th className="w-[140px] border-b border-zinc-200 px-4 py-3">
                    Date
                  </th>
                  <th className="border-b border-zinc-200 px-4 py-3">Event</th>
                  <th className="w-[220px] border-b border-zinc-200 px-4 py-3">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {dated.length > 0 ? (
                  dated.map((r, idx) => (
                    <tr key={r.id} className="align-top">
                      <td className="border-b border-zinc-200 px-4 py-3 text-xs font-semibold text-zinc-700">
                        {idx + 1}
                      </td>
                      <td className="border-b border-zinc-200 px-4 py-3 text-xs font-semibold text-zinc-700">
                        {formatDateUK(r.event_date!)}
                      </td>
                      <td className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-900">
                        {r.summary}
                      </td>
                      <td className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-800">
                        {r.evidence ?? ""}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-5 text-sm text-zinc-700">
                      No dated events.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Undated */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900">Undated events</h2>

          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm print:shadow-none">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs font-semibold text-zinc-700">
                  <th className="w-[56px] border-b border-zinc-200 px-4 py-3">
                    No.
                  </th>
                  <th className="w-[140px] border-b border-zinc-200 px-4 py-3">
                    Date
                  </th>
                  <th className="border-b border-zinc-200 px-4 py-3">Event</th>
                  <th className="w-[220px] border-b border-zinc-200 px-4 py-3">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {undated.length > 0 ? (
                  undated.map((r, idx) => (
                    <tr key={r.id} className="align-top">
                      <td className="border-b border-zinc-200 px-4 py-3 text-xs font-semibold text-zinc-700">
                        {idx + 1}
                      </td>
                      <td className="border-b border-zinc-200 px-4 py-3 text-xs font-semibold text-zinc-700">
                        Date unknown
                      </td>
                      <td className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-900">
                        {r.summary}
                      </td>
                      <td className="border-b border-zinc-200 px-4 py-3 text-sm text-zinc-800">
                        {r.evidence ?? ""}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-5 text-sm text-zinc-700">
                      No undated events.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 text-xs text-zinc-500">End of document.</div>
      </main>
    </div>
  );
}
