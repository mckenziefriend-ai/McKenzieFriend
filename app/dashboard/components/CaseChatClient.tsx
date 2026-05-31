"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type ProposedAction = {
  type: "create_chronology_event" | "create_calendar_item" | "create_bundle_item" | "create_statement";
  label: string;
  payload: Record<string, any>;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  action?: ProposedAction | null;
};

const shortcuts = ["Add event", "Draft statement", "Add date", "Build bundle"];

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

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = input.trim();
    if ((!text && files.length === 0) || loading) return;

    const attachmentsText = files.length ? `\n\nAttached: ${files.map((file) => file.name).join(", ")}` : "";
    const visibleText = `${text || "Uploaded image"}${attachmentsText}`;
    const filesToSend = files;

    setInput("");
    setFiles([]);
    setError("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: visibleText }]);

    try {
      const formData = new FormData();
      formData.append("caseId", caseId);
      formData.append("message", text || "Please review the uploaded image.");
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
    } catch (err: any) {
      setError(err?.message || "No response.");
    } finally {
      setLoading(false);
    }
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
    } catch (err: any) {
      setError(err?.message || "Could not save.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="flex h-[calc(100dvh-109px)] flex-col bg-[#F8FAFC] md:h-[calc(100dvh-56px)]">
      <div className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-7">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-[#0B1A2B]">McKenzie Friend AI</h1>
            {caseTitle ? <div className="mt-0.5 truncate text-xs text-slate-500">{caseTitle}</div> : null}
          </div>
          <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 sm:block">
            Synced
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-7">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-2xl animate-soft-in rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm md:px-7 md:py-8">
                <div className="text-2xl font-semibold tracking-tight text-[#0B1A2B] md:text-3xl">McKenzie Friend AI</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {shortcuts.map((shortcut) => (
                    <button
                      key={shortcut}
                      type="button"
                      onClick={() => setInput(shortcut)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[#88D2DC] hover:bg-[#88D2DC]/10 active:scale-[0.98]"
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
                        : "max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm md:max-w-[78%]",
                    ].join(" ")}
                  >
                    {message.content}
                  </div>
                  {message.role === "assistant" && message.action ? (
                    <div className="mt-3 rounded-2xl border border-[#88D2DC]/50 bg-[#88D2DC]/10 p-3 md:max-w-[78%]">
                      <button
                        type="button"
                        onClick={() => runAction(message.action!, index)}
                        disabled={actionLoading !== null}
                        className="rounded-lg bg-[#0B1A2B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10243A] active:scale-[0.98] disabled:opacity-50"
                      >
                        {actionLoading === index ? "Saving…" : message.action.label}
                      </button>
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
