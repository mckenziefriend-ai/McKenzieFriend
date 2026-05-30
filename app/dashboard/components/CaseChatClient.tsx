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
      if (!res.ok) throw new Error(data?.error || "No response.");

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer || "No response." },
      ]);
    } catch (err: any) {
      setError(err?.message || "No response.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex h-[calc(100vh-56px)] flex-col bg-white">
      <div className="border-b border-slate-200 px-5 py-3 md:px-8">
        <h1 className="text-sm font-semibold tracking-tight text-[#0B1A2B]">Case assistant</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-3xl">
              <div className="border-b border-slate-200 pb-4 text-2xl font-semibold tracking-tight text-[#0B1A2B] md:text-3xl">
                Case assistant
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={[
                  "whitespace-pre-wrap text-sm leading-7",
                  message.role === "user"
                    ? "ml-auto max-w-[82%] rounded-2xl bg-[#0B1A2B] px-4 py-3 text-white"
                    : "max-w-[92%] border-l-2 border-[#88D2DC] pl-4 text-slate-800",
                ].join(" ")}
              >
                {message.content}
              </div>
            ))}
            {loading ? <div className="border-l-2 border-slate-200 pl-4 text-sm text-slate-500">Working…</div> : null}
            {error ? <div className="border-l-2 border-red-300 pl-4 text-sm text-red-700">{error}</div> : null}
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-3 md:p-5">
        <div className="mx-auto flex max-w-3xl gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-[#88D2DC] focus-within:ring-4 focus-within:ring-[#88D2DC]/20">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Message"
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#0B1A2B] outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-[#0B1A2B] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
