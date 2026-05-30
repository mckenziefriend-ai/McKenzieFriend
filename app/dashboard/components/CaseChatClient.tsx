"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function CaseChatClient({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: text }]);

    try {
      const res = await fetch("/api/ai/case-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, message: text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "The assistant could not respond.");

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer || "I could not generate a response." },
      ]);
    } catch (err: any) {
      setError(err?.message || "The assistant could not respond.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex h-[calc(100vh-120px)] min-h-[560px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-104px)]">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h1 className="text-base font-semibold tracking-tight sm:text-lg">Chat</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <div className="text-2xl font-semibold tracking-tight">Ask anything about this case.</div>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
                <button type="button" onClick={() => setInput("Summarise this case")} className="rounded-full border border-slate-200 px-3 py-2 hover:bg-slate-50">Summarise this case</button>
                <button type="button" onClick={() => setInput("Draft a statement")} className="rounded-full border border-slate-200 px-3 py-2 hover:bg-slate-50">Draft a statement</button>
                <button type="button" onClick={() => setInput("What dates matter?")} className="rounded-full border border-slate-200 px-3 py-2 hover:bg-slate-50">What dates matter?</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={[
                  "max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[76%]",
                  message.role === "user" ? "ml-auto bg-[#0B1A2B] text-white" : "bg-[#F6F8FA] text-slate-800",
                ].join(" ")}
              >
                {message.content}
              </div>
            ))}
            {loading ? <div className="max-w-[76%] rounded-2xl bg-[#F6F8FA] px-4 py-3 text-sm text-slate-600">Thinking…</div> : null}
            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="border-t border-slate-100 p-3 sm:p-4">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-[#F7F9FB] p-2 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Message"
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#0B1A2B] outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-[#0B1A2B] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
