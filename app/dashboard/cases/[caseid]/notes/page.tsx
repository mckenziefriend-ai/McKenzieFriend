import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";
import DeleteNoteButton from "@/app/dashboard/cases/DeleteNoteButton";

export const dynamic = "force-dynamic";

type NoteRow = {
  id: string;
  title: string | null;
  body: string;
  pinned: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatDateUK(dateISO: string) {
  return new Date(dateISO).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CaseNotesPage({
  params,
}: {
  params: Promise<{ caseid: string }>;
}) {
  const { caseid: caseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id,title")
    .eq("id", caseId)
    .eq("user_id", user.id)
    .single();

  if (!caseRow) redirect("/dashboard/cases");

  const { data: notesData } = await supabase
    .from("case_notes")
    .select("id,title,body,pinned,created_at,updated_at")
    .eq("case_id", caseId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const notes = (notesData as NoteRow[] | null) ?? [];

  // Ownership of the case is re-checked in each action so a note can never be
  // written against a case the signed-in user does not own.
  async function assertOwnedCase() {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: owned } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .single();
    if (!owned) redirect("/dashboard/cases");
    return { supabase, userId: user.id };
  }

  async function addNote(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const pinned = String(formData.get("pinned") ?? "") === "on";
    if (!body) return;

    const { supabase, userId } = await assertOwnedCase();
    await supabase.from("case_notes").insert({
      case_id: caseId,
      user_id: userId,
      title: title || null,
      body,
      pinned,
    });
    redirect(`/dashboard/cases/${caseId}/notes`);
  }

  async function updateNote(formData: FormData) {
    "use server";
    const noteId = String(formData.get("note_id") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!noteId || !body) return;

    const { supabase, userId } = await assertOwnedCase();
    await supabase
      .from("case_notes")
      .update({ title: title || null, body, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("user_id", userId);
    redirect(`/dashboard/cases/${caseId}/notes`);
  }

  async function togglePin(formData: FormData) {
    "use server";
    const noteId = String(formData.get("note_id") ?? "");
    const pinned = String(formData.get("pinned") ?? "") === "true";
    if (!noteId) return;

    const { supabase, userId } = await assertOwnedCase();
    await supabase
      .from("case_notes")
      .update({ pinned: !pinned })
      .eq("id", noteId)
      .eq("user_id", userId);
    redirect(`/dashboard/cases/${caseId}/notes`);
  }

  async function deleteNote(formData: FormData) {
    "use server";
    const noteId = String(formData.get("note_id") ?? "");
    if (!noteId) return;

    const { supabase, userId } = await assertOwnedCase();
    await supabase.from("case_notes").delete().eq("id", noteId).eq("user_id", userId);
    redirect(`/dashboard/cases/${caseId}/notes`);
  }

  async function addToChronology(formData: FormData) {
    "use server";
    const summary = String(formData.get("summary") ?? "").trim();
    if (!summary) return;

    const { supabase } = await assertOwnedCase();
    await supabase.from("case_events").insert({
      case_id: caseId,
      date_unknown: true,
      event_date: null,
      summary: summary.slice(0, 2000),
    });
    redirect(`/dashboard/cases/${caseId}/chronology`);
  }

  return (
    <CaseWorkspaceShell caseId={caseId} title={caseRow.title} active="Notes">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 md:px-8 md:py-7">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Notes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Private, freeform notes for this case — how a call or hearing went, how you&rsquo;re
            feeling, questions to raise next time. Only you can see these.
          </p>
        </div>

        {/* Add a note */}
        <div className="border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
          <div className="text-lg font-semibold text-[#0B1A2B]">Add a note</div>
          <form action={addNote} className="mt-5 grid gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Title (optional)</label>
              <input
                name="title"
                placeholder="A short label, if you want one"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Note</label>
              <textarea
                name="body"
                placeholder="Write whatever you want to remember."
                className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                required
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input name="pinned" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Pin to top
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B1A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A1726]"
              >
                Save note
              </button>
            </div>
          </form>
        </div>

        {/* Notes list */}
        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
              No notes yet. Anything you jot here stays private to your account.
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {note.pinned ? (
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#0B1A2B]/60">
                        Pinned
                      </div>
                    ) : null}
                    {note.title ? (
                      <div className="text-sm font-semibold text-[#0B1A2B]">{note.title}</div>
                    ) : null}
                    <div className="mt-1 whitespace-pre-wrap text-sm text-[#0B1A2B]">
                      {note.body}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {note.created_at ? formatDateUK(note.created_at) : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <form action={togglePin}>
                    <input type="hidden" name="note_id" value={note.id} />
                    <input type="hidden" name="pinned" value={String(Boolean(note.pinned))} />
                    <button
                      type="submit"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                    >
                      {note.pinned ? "Unpin" : "Pin"}
                    </button>
                  </form>

                  <form action={addToChronology}>
                    <input type="hidden" name="summary" value={note.title ? `${note.title}: ${note.body}` : note.body} />
                    <button
                      type="submit"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                    >
                      Add to chronology
                    </button>
                  </form>

                  <DeleteNoteButton noteId={note.id} action={deleteNote} />

                  <details className="ml-auto">
                    <summary className="cursor-pointer list-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">
                      Edit
                    </summary>
                    <form action={updateNote} className="mt-3 grid gap-3">
                      <input type="hidden" name="note_id" value={note.id} />
                      <input
                        name="title"
                        defaultValue={note.title ?? ""}
                        placeholder="Title (optional)"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                      />
                      <textarea
                        name="body"
                        defaultValue={note.body}
                        className="min-h-[100px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                        required
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="rounded-xl bg-[#0B1A2B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A1726]"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>
                  </details>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </CaseWorkspaceShell>
  );
}
