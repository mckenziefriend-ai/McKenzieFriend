"use client";

export default function DeleteNoteButton({
  noteId,
  action,
}: {
  noteId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this note?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="note_id" value={noteId} />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
      >
        Delete
      </button>
    </form>
  );
}
