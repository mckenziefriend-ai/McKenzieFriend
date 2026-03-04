"use client";

export default function DeleteCaseButton({
  caseId,
  action,
}: {
  caseId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        // eslint-disable-next-line no-alert
        if (!confirm("Delete this case and all its events?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="case_id" value={caseId} />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
      >
        Delete
      </button>
    </form>
  );
}
