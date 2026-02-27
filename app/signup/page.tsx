"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setError(error.message);

    router.push("/dashboard");
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Sign up</h1>
      <form onSubmit={onSubmit}>
        <input
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 10 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 10 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
        />
        <button style={{ padding: 10, width: "100%" }} type="submit">
          Create account
        </button>
      </form>
      {error && <p style={{ marginTop: 12 }}>{error}</p>}
    </main>
  );
}
