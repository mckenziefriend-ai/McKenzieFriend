"use client";

export default function DeleteAccountDataButton({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            "Delete ALL your cases, including every chronology, statement, chat and uploaded document? This cannot be undone."
          )
        )
          e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
      >
        Delete all my data
      </button>
    </form>
  );
}
