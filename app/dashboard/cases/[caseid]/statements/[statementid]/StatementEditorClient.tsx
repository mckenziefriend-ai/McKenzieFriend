"use client";

import { useState } from "react";
import Link from "next/link";

type Statement = {
  id: string;
  case_id: string;
  title: string | null;
  statement_by: string | null;
  statement_date: string | null;
  body: string | null;
  updated_at: string | null;
};

export default function StatementEditorClient({
  caseId,
  statementid,
  caseTitle,
  st,
  saveStatement,
  deleteStatement,
}: {
  caseId: string;
  statementid: string;
  caseTitle: string;
  st: Statement;
  saveStatement: (formData: FormData) => void | Promise<void>;
  deleteStatement: () => void | Promise<void>;
}) {
  const [body, setBody] = useState(st.body ?? "");

  async function generateDraft() {
    const notes = prompt("Paste notes or describe the events you want included.");

    if (!notes) return;

    const res = await fetch("/api/ai/statement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes,
      }),
    });

    const data = await res.json();

    if (data.draft) {
      setBody(data.draft);
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-zinc-600">
              STATEMENT EDITOR
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {caseTitle}
            </h1>
            <p className="mt-2 text-sm text-zinc-700">
              Edit freely. You can export a court-style print preview.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/cases/${caseId}/statements/${statementid}/export`}
              className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
            >
              Export
            </Link>
            <Link
              href={`/dashboard/cases/${caseId}/statements`}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <form action={saveStatement} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Title
                </label>
                <input
                  name="title"
                  defaultValue={st.title ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Statement date
                </label>
                <input
                  name="statement_date"
                  type="date"
                  defaultValue={st.statement_date ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Statement by (optional)
              </label>
              <input
                name="statement_by"
                defaultValue={st.statement_by ?? ""}
                placeholder="e.g. Applicant / Respondent / Full name"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Body
              </label>

              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={generateDraft}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                >
                  Generate draft
                </button>
              </div>

              <textarea
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your statement here..."
                className="mt-1 min-h-[420px] w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-zinc-400"
              />

              <div className="mt-2 text-xs text-zinc-500">
                Tip: keep paragraphs short. You can paste full text and edit
                directly.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                formAction={deleteStatement}
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Delete statement
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
