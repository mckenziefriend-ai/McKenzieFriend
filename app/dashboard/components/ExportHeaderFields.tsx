"use client";

import { useState } from "react";

export default function ExportHeaderFields() {
  const [court, setCourt] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [applicant, setApplicant] = useState("");
  const [respondent, setRespondent] = useState("");
  const [children, setChildren] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [hearingType, setHearingType] = useState("");

  const blank = "____________________________";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 print:shadow-none">

      {/* INPUTS — screen only */}
      <div className="print-hidden">

        <div className="text-sm font-semibold">Court heading</div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input label="Court name" value={court} set={setCourt} />
          <Input label="Case number" value={caseNumber} set={setCaseNumber} />
          <Input label="Applicant" value={applicant} set={setApplicant} />
          <Input label="Respondent" value={respondent} set={setRespondent} />
          <Input label="Hearing type" value={hearingType} set={setHearingType} />
          <Input label="Hearing date" value={hearingDate} set={setHearingDate} />
        </div>

        <div className="mt-3">
          <label className="text-xs font-semibold">Children involved</label>
          <textarea
            value={children}
            onChange={(e) => setChildren(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Name (DOB) — one per line"
          />
        </div>
      </div>

      {/* PRINT BLOCK */}
      <div className="print-only hidden print:block text-sm leading-relaxed">

        <div className="font-semibold uppercase">
          IN THE {court || blank}
        </div>

        <div className="mt-2">
          Case Number: {caseNumber || blank}
        </div>

        <div className="mt-4">
          IN THE MATTER OF THE CHILDREN ACT 1989
          <br/>
          AND IN THE MATTER OF THE FAMILY LAW ACT 1996
        </div>

        <div className="mt-4">
          AND IN MATTERS CONCERNING:
          <br/>
          {children || blank}
        </div>

        <div className="mt-6 text-center font-semibold">
          BETWEEN
        </div>

        <div className="mt-2 text-center">
          {applicant || blank}
          <br/>
          Applicant
        </div>

        <div className="mt-2 text-center">
          -and-
        </div>

        <div className="mt-2 text-center">
          {respondent || blank}
          <br/>
          Respondent
        </div>

        <div className="mt-6 text-center font-bold">
          CHRONOLOGY
        </div>

        <div className="mt-2 text-center">
          {hearingType && "For the " + hearingType}
          {hearingDate && " on " + hearingDate}
        </div>

      </div>
    </div>
  );
}

function Input({ label, value, set }: any) {
  return (
    <div>
      <label className="text-xs font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
      />
    </div>
  );
}
