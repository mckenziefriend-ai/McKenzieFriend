"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { PRODUCT_DISCLAIMER, withProvenanceText } from "@/lib/disclaimers";
import type { ProposedAction } from "@/lib/ai/actions";

export type Message = {
  role: "user" | "assistant";
  content: string;
  action?: ProposedAction | null;
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

const shortcuts = ["Draft a statement", "Add an event", "Add a date", "Build bundle"];

function actionTitle(action: ProposedAction) {
  if (action.type === "create_chronology_event") return "Proposed chronology event";
  if (action.type === "create_calendar_item") return "Proposed calendar item";
  if (action.type === "create_bundle_item") return "Proposed bundle item";
  if (action.type === "create_statement") return "Draft statement preview";
  if (action.type === "create_note") return "Proposed note";
  return "Proposed entry";
}

function actionRows(action: ProposedAction) {
  const payload = action.payload || {};

  if (action.type === "create_chronology_event") {
    return [
      ["Date", payload.date_unknown || !payload.event_date ? "Date unknown" : payload.event_date],
      ["Details", payload.summary],
      ["Evidence", payload.evidence || "None linked"],
    ];
  }

  if (action.type === "create_calendar_item") {
    return [
      ["Type", payload.item_type || "Other"],
      ["Title", payload.title],
      ["Date/time", payload.starts_at || "Not set"],
      ["Notes", payload.notes || "None"],
    ];
  }

  if (action.type === "create_bundle_item") {
    return [
      ["Section", payload.section || "General"],
      ["Type", payload.item_type || "Other"],
      ["Title", payload.title],
      ["Notes", payload.notes || "None"],
    ];
  }

  if (action.type === "create_statement") {
    return [
      ["Title", payload.title],
      ["Preview", payload.body ? String(payload.body).slice(0, 900) : "No draft text"],
    ];
  }

  if (action.type === "create_note") {
    return [
      ["Title", payload.title || "None"],
      ["Note", payload.body ? String(payload.body).slice(0, 900) : "No text"],
    ];
  }

  return Object.entries(payload).map(([key, value]) => [key, value ? String(value) : "—"]);
}

function editPrompt(action: ProposedAction) {
  if (action.type === "create_chronology_event") return "Edit the proposed chronology event. ";
  if (action.type === "create_calendar_item") return "Edit the proposed calendar item. ";
  if (action.type === "create_bundle_item") return "Edit the proposed bundle item. ";
  if (action.type === "create_statement") return "Edit the proposed statement draft. ";
  if (action.type === "create_note") return "Edit the proposed note. ";
  return "Edit the proposed entry. ";
}

function statementDraft(action: ProposedAction) {
  if (action.type !== "create_statement") return "";
  return String(action.payload?.body || "");
}

function statementTitle(action: ProposedAction) {
  if (action.type !== "create_statement") return "statement-draft";
  return String(action.payload?.title || "statement-draft")
    .replace(/[^a-z0-9-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "statement-draft";
}

export default function CaseChatClient({
  caseId,
  caseTitle,
  initialMessages = [],
}: {
  caseId: string;
  caseTitle?: string;
  initialMessages?: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const allowed = selected.filter((file) => file.type.startsWith("image/"));
    setFiles((current) => [...current, ...allowed].slice(0, 4));
    event.target.value = "";
  }

  async function submitChatMessage({
    text,
    visibleText,
    filesToSend = [],
  }: {
    text: string;
    visibleText?: string;
    filesToSend?: File[];
  }) {
    const cleanText = text.trim();
    if ((!cleanText && filesToSend.length === 0) || loading) return;

    const shownText = visibleText || cleanText || "Uploaded image";

    setError("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: shownText }]);

    try {
      const formData = new FormData();
      formData.append("caseId", caseId);
      formData.append("message", cleanText || "Please review the uploaded image.");
      filesToSend.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/ai/case-chat", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No response.");

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer || "No response.",
          action: data.action || null,
        },
      ]);
    } catch (err) {
      setError(errorMessage(err, "No response."));
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = input.trim();
    if ((!text && files.length === 0) || loading) return;

    const attachmentsText = files.length ? `\n\nAttached: ${files.map((file) => file.name).join(", ")}` : "";
    const visibleText = `${text || "Uploaded image"}${attachmentsText}`;
    const filesToSend = files;

    setInput("");
    setFiles([]);
    await submitChatMessage({ text: text || "Please review the uploaded image.", visibleText, filesToSend });
  }

  async function runAction(action: ProposedAction, index: number) {
    if (actionLoading !== null) return;
    setError("");
    setActionLoading(index);

    try {
      const res = await fetch("/api/case-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save.");

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.message || "Saved." },
      ]);
    } catch (err) {
      setError(errorMessage(err, "Could not save."));
    } finally {
      setActionLoading(null);
    }
  }

  function askToEdit(action: ProposedAction) {
    setInput(editPrompt(action));
  }

  async function clearChat() {
    if (loading) return;
    const confirmed = window.confirm("Clear this case chat?");
    if (!confirmed) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/ai/case-chat?caseId=${encodeURIComponent(caseId)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not clear chat.");
      setMessages([]);
    } catch (err) {
      setError(errorMessage(err, "Could not clear chat."));
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy text.");
    }
  }

  function downloadText(filename: string, text: string) {
    const blob = new Blob([withProvenanceText(text)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function translateMessage(text: string) {
    const language = window.prompt("Translate to which language?", "Urdu");
    if (!language) return;
    await submitChatMessage({
      text: `Translate this into ${language}. Keep the meaning the same. If it is for official court use, mention that a certified translation may be needed.\n\n${text}`,
      visibleText: `Translate to ${language}`,
    });
  }

  async function applyTone(tone: string) {
    const text = input.trim();
    if (!text) {
      setError("Type or paste text first, then choose a tone.");
      setToneOpen(false);
      return;
    }

    setToneOpen(false);
    setInput("");
    await submitChatMessage({
      text: `${tone}. Keep the meaning the same and keep it suitable for England and Wales court preparation where relevant:\n\n${text}`,
      visibleText: tone,
    });
  }

  return (
    <section className="flex h-[calc(100dvh-109px)] flex-col bg-[#F8FAFC] md:h-[calc(100dvh-56px)]">
      <div className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-7">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-[#0B1A2B]">McKenzie Friend AI</h1>
            {caseTitle ? <div className="mt-0.5 truncate text-xs text-slate-500">{caseTitle}</div> : null}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg leading-none text-slate-600 transition hover:bg-white active:scale-[0.98]"
              aria-label="Chat options"
            >
              ⋯
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void clearChat();
                  }}
                  className="block w-full px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50"
                >
                  Clear chat
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-500">{PRODUCT_DISCLAIMER}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-7">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-2xl animate-soft-in px-1 py-6 md:px-0 md:py-8">
                <div className="text-2xl font-semibold tracking-tight text-[#0B1A2B] md:text-3xl">McKenzie Friend AI</div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Start with a question, note, date, document, or draft.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {shortcuts.map((shortcut) => (
                    <button
                      key={shortcut}
                      type="button"
                      onClick={() => setInput(shortcut)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#88D2DC] hover:bg-[#88D2DC]/10 active:scale-[0.98]"
                    >
                      {shortcut}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pb-2">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className="animate-soft-in">
                  <div
                    className={[
                      "whitespace-pre-wrap text-sm leading-7 transition",
                      message.role === "user"
                        ? "ml-auto max-w-[88%] rounded-2xl bg-[#0B1A2B] px-4 py-3 text-white shadow-sm md:max-w-[72%]"
                        : "max-w-[94%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm md:max-w-[80%]",
                    ].join(" ")}
                  >
                    {message.content}
                  </div>

                  {message.role === "assistant" ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => void copyText(message.content)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                        aria-label="Copy message"
                        title="Copy"
                      >
                        ⧉
                      </button>
                      <button type="button" onClick={() => void translateMessage(message.content)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 transition hover:bg-slate-50">Translate</button>
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.action ? (
                    <div className="mt-3 max-w-[94%] animate-soft-in rounded-2xl border border-[#88D2DC]/60 bg-white p-4 shadow-sm md:max-w-[80%]">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {actionTitle(message.action)}
                      </div>
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                        {actionRows(message.action).map(([label, value]) => (
                          <div key={String(label)} className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[140px_1fr]">
                            <div className="font-medium text-slate-500">{String(label)}</div>
                            <div className="whitespace-pre-wrap text-slate-800">{String(value ?? "—")}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => runAction(message.action!, index)}
                          disabled={actionLoading !== null}
                          className="rounded-lg bg-[#0B1A2B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10243A] active:scale-[0.98] disabled:opacity-50"
                        >
                          {actionLoading === index ? "Saving…" : message.action.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => askToEdit(message.action!)}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                        >
                          Edit
                        </button>
                        {message.action.type === "create_statement" && statementDraft(message.action) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void copyText(statementDraft(message.action!))}
                              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                            >
                              Copy draft
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadText(statementTitle(message.action!), statementDraft(message.action!))}
                              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                            >
                              Download .txt
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
              {loading ? <div className="animate-pulse rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">Working…</div> : null}
              {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <form onSubmit={sendMessage} className="shrink-0 border-t border-slate-200 bg-white p-3 md:p-5">
        {files.length > 0 ? (
          <div className="mx-auto mb-2 flex max-w-4xl flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                <span className="max-w-[180px] truncate">{file.name}</span>
                <button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="font-semibold text-slate-500 hover:text-red-700">
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mx-auto flex max-w-4xl gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm transition focus-within:border-[#88D2DC] focus-within:ring-4 focus-within:ring-[#88D2DC]/20">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={onFilesSelected} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            aria-label="Upload image"
          >
            +
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            rows={1}
            placeholder="Message"
            className="max-h-32 min-h-[48px] min-w-0 flex-1 resize-none bg-transparent px-2 py-3 text-sm text-[#0B1A2B] outline-none placeholder:text-slate-400"
          />
          <div className="relative self-stretch">
            <button
              type="button"
              onClick={() => setToneOpen((open) => !open)}
              className="h-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Tone
            </button>
            {toneOpen ? (
              <div className="absolute bottom-14 right-0 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                {[
                  "Make this more formal",
                  "Make this more factual",
                  "Make this shorter",
                  "Make this clearer",
                  "Make this less emotional",
                  "Turn this into statement wording",
                  "Turn this into chronology wording",
                ].map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => void applyTone(tone)}
                    className="block w-full px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50"
                  >
                    {tone.replace("Make this ", "").replace("Turn this into ", "")}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={loading || (!input.trim() && files.length === 0)}
            className="rounded-xl bg-[#0B1A2B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10243A] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
