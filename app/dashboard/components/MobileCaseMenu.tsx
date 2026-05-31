"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { label: "McKenzie Friend AI", href: "chat" },
  { label: "Chronology", href: "chronology" },
  { label: "Statements", href: "statements" },
  { label: "Documents", href: "documents" },
  { label: "Calendar", href: "calendar" },
  { label: "Bundle", href: "bundle" },
];

export default function MobileCaseMenu({
  caseId,
  title,
  active,
}: {
  caseId: string;
  title: string;
  active: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#0B1A2B] md:hidden"
      >
        Menu
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#0B1A2B]/45"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[82vw] max-w-xs flex-col bg-[#0B1A2B] text-white shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <Link href="/dashboard/cases" className="text-xs font-semibold text-white/60">
                  Cases
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-white/15 px-2 py-1 text-xs font-semibold text-white/80"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 truncate text-sm font-semibold" title={title}>
                {title}
              </div>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {navItems.map((item) => {
                const isActive = item.label === active;
                return (
                  <Link
                    key={item.label}
                    href={`/dashboard/cases/${caseId}/${item.href}`}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex items-center border-l-2 px-3 py-3 text-sm font-medium",
                      isActive
                        ? "border-[#88D2DC] bg-white/10 text-white"
                        : "border-transparent text-white/70 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
