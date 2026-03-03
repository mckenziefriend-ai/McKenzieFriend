import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "../../components/PrintButton";

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

function formatHearingUK(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function upperOrEmpty(s?: string | null) {
  const v = (s ?? "").trim();
  return v ? v.toUpperCase() : "";
}

function DebugPanel({
  title,
  data,
  backHref,
}: {
  title: string;
  data: any;
  backHref: string;
}) {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          <div className="mt-2 text-xs text-zinc-600">
            This page is showing you why export redirected.
          </div>

          <pre className="mt-4 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-[11px] text-zinc-800">
            {JSON.stringify(data, null, 2)}
          </pre>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default async function ExportChronologyPage({
  params,
}: {
  params: Promise<{ caseid: string }>;
}) {
  const { caseid: caseId } = await params;

  const supabase = await createClient();

  // 1) Auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (!user) {
    // Keep normal behaviour for auth (no need to debug here)
    redirect("/login");
  }

  // 2) Private beta
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("is_private_beta")
    .eq("id", user.id)
    .single();

  if (!profile?.is_private_beta) {
    return DebugPanel({
      title: "Export blocked: profile not private beta",
      backHref: `/dashboard/chronology/${caseId}`,
      data: {
        userId: user.id,
        email: user.email,
        profile,
        profileErr,
      },
    });
  }

  // 3) Unlock cookie
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get("chrono_unlocked")?.value;
  const unlocked = cookieVal === "1";

  if (!unlocked) {
    return DebugPanel({
      title: "Export blocked: chronology not unlocked (cookie missing)",
      backHref: `/dashboard/chronology/${caseId}`,
      data: {
        chrono_unlocked: cookieVal ?? null,
        note:
          "If this is null, your unlock route didn't set the cookie on this domain/path.",
      },
    });
  }

  // 4) Case row (match your actual schema)
  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select(
      "id,title,created_at,court_name,court_slug,case_number,hearing_title,hearing_datetime,proceedings_heading,proceedings_lines"
    )
    .eq("id", caseId)
    .single();

  if (caseErr || !caseRow) {
    return DebugPanel({
      title: "Export blocked: case not accessible (RLS or select error)",
      backHref: "/dashboard/chronology",
      data: {
        caseId,
        caseErr,
        caseRow,
        hint:
          "If caseErr mentions a missing column, your DB schema doesn't match the select(). If it mentions permission, RLS blocked it.",
      },
    });
  }

  // Events
  const { data: events, error: eventsErr } = await supabase
    .from("case_events")
    .select("id,event_date,date_unknown,summary,evidence,created_at")
    .eq("case_id", caseId);

  if (eventsErr) {
    return DebugPanel({
      title: "Export blocked: could not load events",
      backHref: `/dashboard/chronology/${caseId}`,
      data: { caseId, eventsErr },
    });
  }

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

  const hearingLineParts = [
    caseRow.hearing_title ? String(caseRow.hearing_title).trim() : "",
    caseRow.hearing_datetime ? formatHearingUK(caseRow.hearing_datetime) : "",
  ].filter(Boolean);

  const proceedingsHeading = String(
    caseRow.proceedings_heading ?? "CHRONOLOGY"
  ).trim();

  const proceedingsLines = (caseRow.proceedings_lines as string[] | null) ?? [];

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
        }
        .print-only { display: none; }
      `}</style>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
              href={`/dashboard/chronology/${caseId}`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm print:shadow-none sm:p-8">
          <div className="text-xs font-semibold text-zinc-700">
            {upperOrEmpty(caseRow.court_name ? `IN THE ${caseRow.court_name}` : "")}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-[11px] font-semibold text-zinc-600">
                Case number
              </div>
              <div className="mt-0.5 text-sm font-semibold text-zinc-900">
                {caseRow.case_number ?? ""}
              </div>
            </div>
          </div>

          {proceedingsLines.length > 0 ? (
            <div className="mt-4 text-xs text-zinc-700">
              {proceedingsLines.map((l, i) => (
                <div key={`${l}-${i}`} className="leading-5">
                  {upperOrEmpty(l)}
                </div>
              ))}
            </div>
          ) : null}

          {hearingLineParts.length > 0 ? (
            <div className="mt-4 text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Hearing:</span>{" "}
              {hearingLineParts.join(" • ")}
            </div>
          ) : null}
        </div>

        <div className="mt-6 text-center">
          <div className="font-bold tracking-tight text-zinc-900">
            {upperOrEmpty(proceedingsHeading)}
          </div>
          <div className="mt-1 text-sm text-zinc-700">{caseRow.title}</div>
        </div>

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
