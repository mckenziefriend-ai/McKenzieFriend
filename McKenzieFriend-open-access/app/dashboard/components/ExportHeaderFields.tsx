import type { ComponentType } from "react";

type CourtPickerProps = {
  nameField?: string;
  slugField?: string;
  defaultName?: string;
  defaultSlug?: string;
  placeholder?: string;
};

type Props = {
  initial: {
    court_name: string;
    court_slug: string;
    case_number: string;
    hearing_title: string;
    hearing_datetime: string;
    proceedings_heading: string;
    proceedings_lines: string;
  };
  CourtPicker: ComponentType<CourtPickerProps>;
};

export default function ExportHeaderFields({ initial, CourtPicker }: Props) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-700">
            Court name
          </label>
          <div className="mt-1">
            <CourtPicker
              nameField="court_name"
              slugField="court_slug"
              defaultName={initial.court_name}
              defaultSlug={initial.court_slug}
              placeholder="Start typing e.g. East London"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700">
            Case number
          </label>
          <input
            name="case_number"
            defaultValue={initial.case_number}
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-700">
            Hearing title
          </label>
          <input
            name="hearing_title"
            defaultValue={initial.hearing_title}
            placeholder="e.g. First Hearing Dispute Resolution Appointment"
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700">
            Hearing date/time
          </label>
          <input
            name="hearing_datetime"
            type="datetime-local"
            defaultValue={initial.hearing_datetime}
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
          <div className="mt-1 text-[11px] text-zinc-500">
            If you only have a date, you can leave the time as 00:00.
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-700">
          Proceedings heading (optional)
        </label>
        <input
          name="proceedings_heading"
          defaultValue={initial.proceedings_heading}
          placeholder="e.g. IN THE MATTER OF AN APPLICATION UNDER..."
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-700">
          Proceedings lines (optional)
        </label>
        <textarea
          name="proceedings_lines"
          defaultValue={initial.proceedings_lines}
          placeholder={`One per line, e.g.\nAND IN MATTERS CONCERNING (Name) (DOB)\nAND IN MATTERS CONCERNING (Name) (DOB)`}
          className="mt-1 min-h-[120px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
        />
        <div className="mt-1 text-[11px] text-zinc-500">
          This prints under the case number. Leave blank if not needed.
        </div>
      </div>

      {/* Hidden slug field in case CourtPicker doesn't render it */}
      <input type="hidden" name="court_slug" defaultValue={initial.court_slug} />
    </div>
  );
}
