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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Logo"
            width={200}
            height={200}
            priority
          />
        </div>

        <h1 className="text-2xl font-semibold text-center text-gray-900">
          Create your account
        </h1>

        <p className="text-sm text-gray-500 text-center mt-2">
          Secure access to your legal AI workspace
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

        <p className="text-sm text-gray-600 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
