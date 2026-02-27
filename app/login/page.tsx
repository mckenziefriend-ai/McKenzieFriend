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
            Log in to continue to your legal AI workspace
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-black text-white font-medium hover:opacity-90 transition disabled:opacity-60"
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
            <Link href="/signup" className="font-medium text-black hover:underline">
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
