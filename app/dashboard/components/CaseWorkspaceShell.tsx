import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { label: "Chat", href: "chat" },
  { label: "Chronology", href: "chronology" },
  { label: "Statements", href: "statements" },
  { label: "Documents", href: "documents" },
  { label: "Calendar", href: "calendar" },
  { label: "Bundle", href: "bundle" },
];

export function CaseWorkspaceShell({
  caseId,
  title,
  active = "Chat",
  children,
}: {
  caseId: string;
  title: string;
  active?: string;
  children: ReactNode;
  assistant?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#0B1A2B]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/dashboard/cases" aria-label="Cases" className="inline-flex items-center">
            <Image src="/logo.png" alt="McKenzie Friend AI" width={118} height={30} priority className="h-5 w-auto object-contain sm:h-6" />
          </Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1500px] lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-56px)] border-r border-slate-200 bg-white px-4 py-5 lg:block">
          <Link href="/dashboard/cases" className="text-xs font-semibold text-slate-500 hover:text-[#0B1A2B]">
            ← Cases
          </Link>
          <div className="mt-4 border-b border-slate-100 pb-4">
            <div className="truncate text-sm font-semibold text-[#0B1A2B]" title={title}>{title}</div>
          </div>
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const isActive = item.label === active;
              const href = `/dashboard/cases/${caseId}/${item.href}`;
              return (
                <Link
                  key={item.label}
                  href={href}
                  prefetch
                  className={[
                    "block rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                    isActive ? "bg-[#0B1A2B] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-[#0B1A2B]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard/cases" className="text-xs font-semibold text-slate-500">← Cases</Link>
              <div className="min-w-0 truncate text-sm font-semibold">{title}</div>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navItems.map((item) => {
                const isActive = item.label === active;
                return (
                  <Link
                    key={item.label}
                    href={`/dashboard/cases/${caseId}/${item.href}`}
                    prefetch
                    className={[
                      "whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold",
                      isActive ? "bg-[#0B1A2B] text-white" : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AssistantPanel({ caseId }: { caseId: string }) {
  return (
    <Link href={`/dashboard/cases/${caseId}/chat`} className="inline-flex rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10243A]">
      Chat
    </Link>
  );
}
