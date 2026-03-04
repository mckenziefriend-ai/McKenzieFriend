"use client";

export default function DeleteEventButton({
  caseId,
  eventId,
  action,
}: {
  caseId: string;
  eventId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        // eslint-disable-next-line no-alert
        if (!confirm("Delete this event?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="case_id" value={caseId} />
      <input type="hidden" name="event_id" value={eventId} />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
      >
        Delete
      </button>
    </form>
  );
}
