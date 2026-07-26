import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { removeStorageUnderPrefix } from "@/lib/storageCleanup";
import DeleteAccountDataButton from "./DeleteAccountDataButton";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  async function deleteAccountData() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Uploaded files first: the DB cascade removes rows, not storage
    // objects. Failures are logged server-side and do not block deletion.
    await removeStorageUnderPrefix(supabase, user.id);

    // Deleting the cases rows cascades to events, statements, documents,
    // chat messages, calendar and bundle items.
    await supabase.from("cases").delete().eq("user_id", user.id);

    const cookieStore = await cookies();
    cookieStore.delete("mf_default_case_id");

    redirect("/dashboard/account?deleted=1");
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#0B1A2B]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" aria-label="Dashboard" className="inline-flex items-center"><Image src="/logo.png" alt="McKenzie Friend AI" width={150} height={38} priority className="h-7 w-auto object-contain" /></Link>
          <Link href="/dashboard" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Dashboard</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="mt-2 text-sm text-slate-600">Signed in as {user.email}</p>

          {deleted ? (
            <div className="mt-4 border-l-2 border-emerald-400 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Your case data has been deleted.
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
            <h2 className="text-lg font-semibold">Delete your data</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              This permanently deletes every case in your account, including all
              chronology events, statements, chat history, calendar entries,
              bundle items and uploaded documents. It cannot be undone.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Your login itself is not removed by this action. To have your
              account credentials deleted as well, email{" "}
              <a href="mailto:contact@mckenziefriend.ai" className="font-semibold underline">
                contact@mckenziefriend.ai
              </a>{" "}
              after deleting your data.
            </p>
            <div className="mt-4">
              <DeleteAccountDataButton action={deleteAccountData} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
