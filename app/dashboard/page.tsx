import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main style={{ maxWidth: 700, margin: "40px auto" }}>
      <h1>Dashboard</h1>
      <p>Signed in as: {user.email}</p>
    </main>
  );
}
