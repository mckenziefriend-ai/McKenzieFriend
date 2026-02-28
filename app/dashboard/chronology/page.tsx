import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function ChronologyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_private_beta")
    .eq("id", user.id)
    .single();

  if (!profile?.is_private_beta) redirect("/");

  const unlocked = cookies().get("chrono_unlocked")?.value === "1";
  if (!unlocked) redirect("/dashboard");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Chronology generator
      </h1>
      <p className="mt-2 text-sm text-zinc-700">
        Private development screen.
      </p>
    </main>
  );
}
