"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export default function SignupPage() {
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

    const { error } = await supabase.auth.signUp({ email, password });

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

          <p className="text-xs text-gray-500 text-center mt-2">
            For litigants in person in England & Wales
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {error && (
            <p className="text-sm text-red-600 mt-4 text-center">
              {error}
            </p>
          )}

          <p className="text-sm text-gray-700 text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-black hover:underline">
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
