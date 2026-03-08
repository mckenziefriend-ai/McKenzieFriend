"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type Statement = {
  id: string;
  case_id: string;
  title: string | null;
  statement_by: string | null;
  statement_date: string | null;
  body: string | null;
  updated_at: string | null;
  witness_name: string | null;
  party_role: string | null;
  application_type: string | null;
};

type CaseEvent = {
  id: string;
  event_date: string | null;
  date_unknown: boolean | null;
  summary: string;
};

function formatDateUK(dateISO: string) {
  return new Date(dateISO).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StatementEditorClient({
  caseId,
  statementid,
  caseTitle,
  st,
  events,
  saveStatement,
  deleteStatement,
}: {
  caseId: string;
  statementid: string;
  caseTitle: string;
  st: Statement;
  events: CaseEvent[];
  saveStatement: (formData: FormData) => void | Promise<void>;
  deleteStatement: () => void | Promise<void>;
}) {
  const [body, setBody] = useState(st.body ?? "");
  const [draftOpen, setDraftOpen] = useState(false);
  const [starterOpen, setStarterOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  const [selectedText, setSelectedText] = useState("");
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [rewriteMode, setRewriteMode] = useState("court");
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewResult, setReviewResult] = useState<{
    issues: Array<{
      type: string;
      quote: string;
      message: string;
      suggestion: string;
    }>;
    summary?: string;
  } | null>(null);

  const starters = [
    "I am the Applicant in these proceedings.",
    "I am the Respondent in these proceedings.",
    "I make this statement in support of my application.",
    "I make this statement in response to the application.",
    "The facts in this statement are within my own knowledge unless stated otherwise.",
    "I have prepared this statement following the order dated ",
    "The parties separated in ",
    "I believe the facts stated in this witness statement are true.",
  ];

  const selectedEvents = useMemo(
    () => events.filter((e) => selectedEventIds.includes(e.id)),
    [events, selectedEventIds]
  );

  function toggleEvent(id: string) {
    setSelectedEventIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function insertStarter(text: string) {
    setBody((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed}\n\n${text}` : text;
    });
    setStarterOpen(false);
  }

  function insertStructuredIntro() {
    const lines: string[] = [];

    if (st.witness_name && st.party_role) {
      lines.push(
        `I am ${st.witness_name}. I am the ${st.party_role.toLowerCase()} in these proceedings.`
      );
    } else if (st.witness_name) {
      lines.push(`I am ${st.witness_name}.`);
    } else if (st.party_role) {
      lines.push(`I am the ${st.party_role.toLowerCase()} in these proceedings.`);
    }

    if (st.application_type) {
      lines.push(
        `I make this statement in support of my application for ${st.application_type}.`
      );
    }

    lines.push(
      "The facts set out in this statement are within my own knowledge unless I indicate otherwise."
    );

    setBody((prev) => {
      const trimmed = prev.trim();
      const introBlock = lines.join("\n\n");
      return trimmed ? `${introBlock}\n\n${trimmed}` : introBlock;
    });
  }

  function captureSelectedText(
    e: React.SyntheticEvent<HTMLTextAreaElement, Event>
  ) {
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const text = target.value.slice(start, end).trim();
    setSelectedText(text);
  }

  async function generateDraftFromNotes() {
    if (!notes.trim() && selectedEvents.length === 0) {
      setAiError("Add notes or select chronology events first.");
      return;
    }

    setIsGenerating(true);
    setAiError("");

    try {
      const res = await fetch("/api/ai/statement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: notes.trim(),
          selectedEvents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || "AI generation failed.");
        return;
      }

      if (!data.draft || typeof data.draft !== "string") {
        setAiError("No draft was returned.");
        return;
      }

      setBody(data.draft);
      setDraftOpen(false);
      setNotes("");
      setSelectedEventIds([]);
    } catch (error) {
      console.error(error);
      setAiError("Something went wrong while generating the draft.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function runRewrite() {
    if (!selectedText.trim()) {
      setRewriteError("Select some text first.");
      return;
    }

    setIsRewriting(true);
    setRewriteError("");

    try {
      const res = await fetch("/api/ai/statement-tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "rewrite",
          selectedText,
          rewriteMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRewriteError(data.error || "Rewrite failed.");
        return;
      }

      if (!data.rewritten) {
        setRewriteError("No rewritten text was returned.");
        return;
      }

      setBody((prev) => prev.replace(selectedText, data.rewritten));
      setRewriteOpen(false);
      setSelectedText(data.rewritten);
    } catch (error) {
      console.error(error);
      setRewriteError("Something went wrong while rewriting.");
    } finally {
      setIsRewriting(false);
    }
  }

  async function runStatementReview() {
    if (!body.trim()) {
      setReviewError("There is no statement text to review.");
      return;
    }

    setIsReviewing(true);
    setReviewError("");
    setReviewResult(null);

    try {
      const res = await fetch("/api/ai/statement-tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "review",
          statementText: body,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReviewError(data.error || "Review failed.");
        return;
      }

      setReviewResult({
        issues: Array.isArray(data.issues) ? data.issues : [],
        summary: data.summary || "",
      });
    } catch (error) {
      console.error(error);
      setReviewError("Something went wrong while reviewing the statement.");
    } finally {
      setIsReviewing(false);
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Witness name
                </label>
                <input
                  name="witness_name"
                  defaultValue={st.witness_name ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Party
                </label>
                <select
                  name="party_role"
                  defaultValue={st.party_role ?? ""}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                >
                  <option value="">Select</option>
                  <option value="Applicant">Applicant</option>
                  <option value="Respondent">Respondent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">
                Application type
              </label>
              <input
                name="application_type"
                defaultValue={st.application_type ?? ""}
                placeholder="e.g. a non-molestation order"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-zinc-700">
                  Body
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStarterOpen(true)}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Starter
                  </button>

                  <button
                    type="button"
                    onClick={insertStructuredIntro}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Insert intro
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDraftOpen(true);
                      setAiError("");
                    }}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Generate draft
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedText) {
                        setRewriteError("Select some text in the statement first.");
                        return;
                      }
                      setRewriteError("");
                      setRewriteOpen(true);
                    }}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Rewrite selected
                  </button>

                  <button
                    type="button"
                    onClick={runStatementReview}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                  >
                    {isReviewing ? "Checking..." : "Check statement"}
                  </button>
                </div>
              </div>

              <textarea
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onSelect={captureSelectedText}
                onKeyUp={captureSelectedText}
                onMouseUp={captureSelectedText}
                placeholder="Type your statement here..."
                className="mt-3 min-h-[420px] w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-zinc-400"
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

        {reviewError ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {reviewError}
          </div>
        ) : null}

        {reviewResult ? (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-lg font-semibold text-zinc-900">
              Statement review
            </div>

            {reviewResult.summary ? (
              <div className="mt-2 text-sm text-zinc-700">
                {reviewResult.summary}
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {reviewResult.issues.length > 0 ? (
                reviewResult.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {issue.type}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-zinc-900">
                      {issue.quote || "Issue"}
                    </div>
                    <div className="mt-1 text-sm text-zinc-700">
                      {issue.message}
                    </div>
                    <div className="mt-2 text-sm text-zinc-600">
                      <span className="font-semibold text-zinc-800">
                        Suggestion:
                      </span>{" "}
                      {issue.suggestion}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-700">
                  No major drafting issues were identified.
                </div>
              )}
            </div>
          </div>
        ) : null}

        {draftOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">
                    Generate draft
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Paste notes or describe the events you want included.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDraftOpen(false);
                    setAiError("");
                  }}
                  className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-50"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-zinc-700">
                  Notes for AI
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 min-h-[180px] w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-zinc-400"
                />
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold text-zinc-700">
                  Use chronology events as context (optional)
                </div>
                <div className="mt-2 max-h-[220px] overflow-auto rounded-xl border border-zinc-200">
                  {events.length > 0 ? (
                    events.map((ev) => (
                      <label
                        key={ev.id}
                        className="flex cursor-pointer items-start gap-3 border-b border-zinc-200 p-3 last:border-b-0 hover:bg-zinc-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEventIds.includes(ev.id)}
                          onChange={() => toggleEvent(ev.id)}
                          className="mt-1 h-4 w-4 rounded border-zinc-300"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-600">
                            {ev.date_unknown || !ev.event_date
                              ? "Date unknown"
                              : formatDateUK(ev.event_date)}
                          </div>
                          <div className="mt-1 text-sm text-zinc-900">
                            {ev.summary}
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-zinc-600">
                      No chronology events available.
                    </div>
                  )}
                </div>
              </div>

              {aiError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {aiError}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-zinc-500">
                  AI assists with drafting. It will only use your notes and any
                  chronology events you select.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftOpen(false);
                      setAiError("");
                    }}
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={generateDraftFromNotes}
                    disabled={isGenerating}
                    className="rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGenerating ? "Generating..." : "Generate draft"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {starterOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">
                    Sentence starters
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Insert a common witness statement line.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStarterOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-50"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-2">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => insertStarter(starter)}
                    className="block w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm text-zinc-900 hover:bg-zinc-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {rewriteOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">
                    Rewrite selected text
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    AI will only rewrite the text you selected.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRewriteOpen(false);
                    setRewriteError("");
                  }}
                  className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-50"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold text-zinc-700">
                  Selected text
                </div>
                <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
                  {selectedText || "No text selected."}
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold text-zinc-700">
                  Rewrite mode
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {[
                    ["court", "Rewrite in court style"],
                    ["factual", "Make more factual"],
                    ["shorten", "Shorten"],
                    ["clarify", "Clarify"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 p-3 text-sm hover:bg-zinc-50"
                    >
                      <input
                        type="radio"
                        name="rewrite_mode"
                        value={value}
                        checked={rewriteMode === value}
                        onChange={() => setRewriteMode(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {rewriteError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {rewriteError}
                </div>
              ) : null}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRewriteOpen(false);
                    setRewriteError("");
                  }}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={runRewrite}
                  disabled={isRewriting}
                  className="rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRewriting ? "Rewriting..." : "Rewrite"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
