"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SignedOutPopup() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sp.get("signedout") !== "1") return;

    setOpen(true);

    // remove the query flag so refresh doesn't show it again
    router.replace(pathname, { scroll: false });

    const t = window.setTimeout(() => setOpen(false), 2200);
    return () => window.clearTimeout(t);
  }, [sp, router, pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-6">
      <div className="pointer-events-none absolute inset-0 bg-black/10" />
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
            ✓
          </div>

          <div className="flex-1">
            <div className="text-sm font-semibold text-zinc-900">
              You have been signed out of your McKenzieFriend.ai account.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
