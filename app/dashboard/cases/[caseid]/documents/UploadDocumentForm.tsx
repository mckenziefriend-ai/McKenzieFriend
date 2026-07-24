"use client";

import { useState } from "react";
import { MAX_UPLOAD_BYTES } from "@/lib/uploadLimits";

type Props = {
  action: (formData: FormData) => Promise<void>;
  categories: string[];
};

export default function UploadDocumentForm({ action, categories }: Props) {
  const [sizeError, setSizeError] = useState<string | null>(null);

  function validate(file: File | null | undefined) {
    if (file && file.size > MAX_UPLOAD_BYTES) {
      setSizeError(
        `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The maximum upload size is 8 MB — try scanning at a lower resolution or splitting the document.`
      );
      return false;
    }
    setSizeError(null);
    return true;
  }

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
        if (!validate(input?.files?.[0])) event.preventDefault();
      }}
      className="mb-6 grid gap-3 border-b border-slate-200 pb-6"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-center">
        <input
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
          required
          onChange={(event) => validate(event.currentTarget.files?.[0])}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0B1A2B] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
        <select
          name="category"
          defaultValue="Evidence"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20"
        >
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10243A]">
          Upload
        </button>
      </div>
      {sizeError ? (
        <div className="border-l-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-900">
          {sizeError}
        </div>
      ) : null}
      <textarea
        name="summary"
        rows={2}
        placeholder="Notes"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20"
      />
    </form>
  );
}
