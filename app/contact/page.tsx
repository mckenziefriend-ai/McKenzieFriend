"use client";

import { useMemo, useState } from "react";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const looksLikeEmail = email.includes("@") && email.includes(".");
    return name.trim().length >= 2 && looksLikeEmail && message.trim().length >= 10;
  }, [name, email, message]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Please complete your name, a valid email, and a brief message.");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Submission failed.");
      }

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      {/* Header (simplified) */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a
            href="/"
            className="group inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold">
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">
              McKenzieFriend<span className="text-zinc-500">.ai</span>
            </span>
          </a>

          <nav className="flex items-center gap-2">
            <a
              href="/about"
              className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              About
            </a>

            <span
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              aria-current="page"
            >
              Contact
            </span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-surface relative">
          <div className="hero-grid pointer-events-none absolute inset-0" />
          <div className="hero-glow pointer-events-none absolute inset-0" />

          <div className="mx-auto max-w-6xl px-4 py-16 text-white sm:px-6 sm:py-18">
            <p className="text-xs font-semibold text-white/60">Contact</p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Enquire with McKenzieFriend<span className="text-white/80">.ai</span>
            </h1>

            <p className="mt-6 max-w-3xl text-pretty text-base leading-7 text-white/80 sm:text-lg">
              Use this form to enquire about independent McKenzie Friend support or AI preparation tools.
              We’ll respond with next steps and any clarification questions.
            </p>

            <div className="mt-6 max-w-2xl space-y-2">
              <p className="text-sm leading-6 text-white/70 sm:text-base">
                For litigants in person in England &amp; Wales.
              </p>
              <p className="text-xs leading-5 text-white/60">
                Not a law firm. Not regulated legal advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Left: guidance */}
            <div className="lg:col-span-5">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                What to include
              </h2>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
                <p className="text-sm font-semibold text-zinc-900">
                  Helpful details (if you can)
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-zinc-700">
                  <li>• What’s happening and what you want help with.</li>
                  <li>• Any deadlines or upcoming dates you’re working to.</li>
                  <li>• What you have already prepared (documents, notes, timeline, etc.).</li>
                </ul>
              </div>

              <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-sm font-semibold text-zinc-900">Boundaries</p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-zinc-700">
                  <li>• No regulated legal advice.</li>
                  <li>• AI outputs are general and must be checked.</li>
                  <li>• Personal support is subject to court permission and rules.</li>
                </ul>
              </div>

            {/* Right: form */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Enquiry form
                </h2>

                {status === "success" ? (
                  <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                    <p className="text-base font-semibold text-zinc-900">Message sent.</p>
                    <p className="mt-2 text-sm leading-7 text-zinc-700">
                      Thanks — your enquiry has been received. We’ll respond with next steps.
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <a
                        href="/"
                        className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                      >
                        Back to home
                      </a>
                      <a
                        href="/about"
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                      >
                        About
                      </a>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="mt-6 space-y-6">
                    {/* Contact details */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" required>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900"
                          placeholder="Your name"
                          autoComplete="name"
                        />
                      </Field>

                      <Field label="Email" required>
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900"
                          placeholder="you@example.com"
                          autoComplete="email"
                          inputMode="email"
                        />
                      </Field>
                    </div>

                    {/* Message */}
                    <div>
                      <div className="flex items-baseline justify-between">
                        <label className="text-sm font-semibold text-zinc-900">
                          Message <span className="text-zinc-500">(required)</span>
                        </label>
                      </div>

                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={8}
                        className="mt-4 w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-zinc-900"
                        placeholder="Write your message here…"
                      />
                    </div>

                    {error ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        {error}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="submit"
                        disabled={status === "submitting"}
                        className={cn(
                          "inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800",
                          status === "submitting" && "pointer-events-none opacity-60"
                        )}
                      >
                        {status === "submitting" ? "Sending…" : "Send enquiry"}
                      </button>

                      <p className="text-xs text-zinc-600">
                        By sending, you confirm you understand this is not regulated legal advice.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          <footer className="mt-14 border-t border-zinc-200 pt-6 text-xs text-zinc-600">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} McKenzieFriend.ai</span>
              <span className="text-zinc-500">England &amp; Wales</span>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-zinc-900">
        {label} {required ? <span className="text-zinc-500">*</span> : null}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
