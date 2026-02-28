import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/app/dashboard/chronology/components/PrintButton";

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
  params: { caseId: string };
}) {
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
    .eq("id", params.caseId)
    .single();
  if (!caseRow) redirect("/dashboard/chronology");

  const { data: events } = await supabase
    .from("case_events")
    .select("id,event_date,date_unknown,summary,evidence,created_at")
    .eq("case_id", params.caseId);

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

  const generatedOn = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {/* Print CSS */}
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 16mm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        {/* Top controls (hidden in print) */}
        <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Export preview
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              Use Print to save as PDF.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <PrintButton />
            <Link
              href={`/dashboard/chronology/${params.caseId}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Document header */}
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 print:shadow-none">
          <div className="text-xs font-semibold text-zinc-600">
            CHRONOLOGY OF EVENTS
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {caseRow.title}
          </h1>

          <div className="mt-3 text-xs text-zinc-600">
            Generated: {generatedOn}
          </div>

          <div className="mt-6 text-sm text-zinc-800">
            <div className="font-semibold">Notes</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              <li>Entries are provided by the user and presented in date order.</li>
              <li>“Date unknown” entries are listed separately at the end.</li>
              <li>Keep language factual and specific.</li>
            </ul>
          </div>
        </div>

        {/* Dated events */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-900">Dated events</h2>

          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm print:shadow-none">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs font-semibold text-zinc-700">
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
                  dated.map((r) => (
                    <tr key={r.id} className="align-top">
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
                    <td
                      colSpan={3}
                      className="px-4 py-5 text-sm text-zinc-700"
                    >
                      No dated events.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Undated events */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900">
            Undated events
          </h2>

          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm print:shadow-none">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs font-semibold text-zinc-700">
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
                  undated.map((r) => (
                    <tr key={r.id} className="align-top">
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
                    <td
                      colSpan={3}
                      className="px-4 py-5 text-sm text-zinc-700"
                    >
                      No undated events.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 text-xs text-zinc-500">
          End of document.
        </div>
      </main>
    </div>
  );
}
