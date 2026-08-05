// app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

/**
 * Shown both in the browser's own validation bubble and as the inline error, so
 * the two can never drift apart.
 */
const AGE_GATE_MESSAGE = "Please confirm you are 18 or over to create an account.";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmedAdult, setConfirmedAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Self-declaration age gate. The privacy notice states the service is for
    // adults; this makes signup match it. Checked before signUp so an
    // unconfirmed attempt never reaches the auth provider.
    if (!confirmedAdult) {
      setError(AGE_GATE_MESSAGE);
      return;
    }

    setLoading(true);

    // NEXT_PUBLIC_SITE_URL (or this origin) must be in Supabase's allowed
    // redirect list, or the confirmation link falls back to the project's
    // default Site URL.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/login`,
        // Record that the declaration was made. A boolean flag only — no date
        // of birth, and nothing that could identify a person is collected.
        data: { confirmed_18: true },
      },
    });

    setLoading(false);
    if (error) return setError(error.message);

    router.push("/dashboard");
  }

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="hero-surface absolute inset-0">
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="hero-glow absolute inset-0 pointer-events-none" />
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <Image src="/logo.png" alt="Logo" width={160} height={160} priority />
          </div>

          <h1 className="text-2xl font-semibold text-center text-gray-900">
            Create your account
          </h1>

          <p className="text-sm text-gray-600 text-center mt-2">
            Secure access to your McKenzieFriend.ai workspace
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#0C1A2B] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1A2B]"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Password</label>

              <div className="relative">
                <input
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 text-[#0C1A2B] placeholder-gray-400 caret-[#0C1A2B] focus:outline-none focus:ring-2 focus:ring-[#0C1A2B]"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 my-auto h-9 px-3 rounded-md text-sm font-medium text-[#0C1A2B]/80 hover:text-[#0C1A2B] hover:bg-zinc-100 transition"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedAdult}
                  onChange={(e) => {
                    // Clear the custom message so the field can revalidate.
                    e.currentTarget.setCustomValidity("");
                    setConfirmedAdult(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  // `required` blocks submission natively — which also works if
                  // JS fails — but the default browser wording is generic.
                  // This makes the native bubble carry our wording instead.
                  onInvalid={(e) => e.currentTarget.setCustomValidity(AGE_GATE_MESSAGE)}
                  aria-describedby="age-gate-note"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-400 accent-[#0C1A2B] focus:outline-none focus:ring-2 focus:ring-[#0C1A2B]"
                  required
                />
                <span className="text-sm text-[#0C1A2B]">
                  I confirm I am 18 or over.
                </span>
              </label>
              <p id="age-gate-note" className="mt-2 text-xs leading-5 text-gray-600">
                This service is for adults preparing their own case. It is not for
                under-18s.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
              style={{ backgroundColor: "#0C1A2B" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#16263D")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0C1A2B")}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {error && (
            <p className="text-sm text-red-600 mt-4 text-center">{error}</p>
          )}

          <p className="text-sm text-gray-700 text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="font-medium hover:underline">
              Log in
            </Link>
          </p>

          <p className="text-[11px] text-gray-500 text-center mt-6">
            Not a law firm. Not regulated legal advice.
          </p>
        </div>
      </div>
    </section>
  );
}
