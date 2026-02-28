"use client";

import { useMemo, useState } from "react";

export default function ExportHeaderFields() {
  const [applicant, setApplicant] = useState("");
  const [respondent, setRespondent] = useState("");
  const [caseNumber, setCaseNumber] = useState("");

  const display = useMemo(
    () => ({
      applicant: applicant.trim() || "________________________",
      respondent: respondent.trim() || "________________________",
      caseNumber: caseNumber.trim() || "________________________",
    }),
    [applicant, respondent, caseNumber]
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 print:shadow-none">
      {/* Screen inputs (hidden in print) */}
      <div className="print-hidden">
        <div className="text-sm font-semibold text-zinc-900">
          Case details (optional)
        </div>
        <div className="mt-1 text-xs text-zinc-600">
          These appear on the exported document.
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700">
              Applicant
            </label>
            <input
              value={applicant}
              onChange={(e) => setApplicant(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              placeholder="e.g. Applicant name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700">
              Respondent
            </label>
            <input
              value={respondent}
              onChange={(e) => setRespondent(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              placeholder="e.g. Respondent name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700">
              Case number
            </label>
            <input
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              placeholder="If known"
            />
          </div>
        </div>
      </div>

      {/* Print header block */}
      <div className="print-only hidden print:block">
        <div className="text-xs font-semibold tracking-wide text-zinc-700">
          IN THE FAMILY COURT
        </div>

        <div className="mt-4 grid gap-2 text-sm text-zinc-900 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold text-zinc-600">
              Applicant
            </div>
            <div className="mt-0.5">{display.applicant}</div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-zinc-600">
              Respondent
            </div>
            <div className="mt-0.5">{display.respondent}</div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-zinc-600">
              Case number
            </div>
            <div className="mt-0.5">{display.caseNumber}</div>
          </div>
        </div>
      </div>

      {/* Also render the values on screen in a subtle way */}
      <div className="mt-4 grid gap-2 text-xs text-zinc-600 print:hidden sm:grid-cols-3">
        <div>
          <span className="font-semibold text-zinc-700">Applicant:</span>{" "}
          {display.applicant}
        </div>
        <div>
          <span className="font-semibold text-zinc-700">Respondent:</span>{" "}
          {display.respondent}
        </div>
        <div>
          <span className="font-semibold text-zinc-700">Case number:</span>{" "}
          {display.caseNumber}
        </div>
      </div>
    </div>
  );
}
