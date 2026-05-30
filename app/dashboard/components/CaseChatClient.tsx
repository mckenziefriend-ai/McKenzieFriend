"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function CaseChatClient({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask about this case, your documents, chronology, statements or translations.",
    },
  ]);
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
    <section className="flex min-h-[540px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-semibold tracking-tight">Chat</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-5">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={[
              "max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%]",
              message.role === "user"
                ? "ml-auto bg-[#0B1A2B] text-white"
                : "bg-[#F6F8FA] text-slate-800",
            ].join(" ")}
          >
            {message.content}
          </div>
        ))}
        {loading ? (
          <div className="max-w-[78%] rounded-2xl bg-[#F6F8FA] px-4 py-3 text-sm text-slate-600">Thinking…</div>
        ) : null}
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      </div>

      <form onSubmit={sendMessage} className="mt-auto flex flex-col gap-2 rounded-2xl border border-slate-200 bg-[#F7F9FB] p-2 sm:flex-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything about this case"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-[#0B1A2B] outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-[#0B1A2B] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </section>
  );
}
