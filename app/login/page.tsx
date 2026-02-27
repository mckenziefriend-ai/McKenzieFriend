"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) return setError(error.message);

    router.push("/dashboard");
  }

  return (
    <section className="relative min-h-screen overflow-hidden">
      
      <div className="hero-surface absolute inset-0">
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="hero-glow absolute inset-0 pointer-events-none" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">

        <div className="w-full max-w-md rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl p-8 border border-white/20">

          <div className="flex justify-center mb-5">
            <Image src="/logo.png" alt="Logo" width={160} height={160} priority />
          </div>

          <h1 className="text-2xl font-semibold text-center text-gray-900">
            Welcome back
          </h1>

          <p className="text-sm text-gray-600 text-center mt-2">
            Log in to continue to your workspace
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Email
              </label>
              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0C1A2B]"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Password
              </label>
              <input
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0C1A2B]"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-medium transition disabled:opacity-60"
              style={{ backgroundColor: "#0C1A2B" }}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

          </form>

          {error && (
            <p className="text-sm text-red-600 mt-4 text-center">
              {error}
            </p>
          )}

          <p className="text-sm text-gray-700 text-center mt-6">
            Don’t have an account?{" "}
            <Link href="/signup" className="font-medium hover:underline">
              Sign up
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
