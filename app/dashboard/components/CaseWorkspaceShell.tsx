import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import MobileCaseMenu from "./MobileCaseMenu";

const navItems = [
  { label: "McKenzie Friend AI", href: "chat" },
  { label: "Chronology", href: "chronology" },
  { label: "Statements", href: "statements" },
  { label: "Documents", href: "documents" },
  { label: "Calendar", href: "calendar" },
  { label: "Bundle", href: "bundle" },
];

export function CaseWorkspaceShell({
  caseId,
  title,
  active = "McKenzie Friend AI",
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
      <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white">
        <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/dashboard/cases" aria-label="Cases" className="flex items-center">
            <Image
              src="/logo.png"
              alt="McKenzie Friend AI"
              width={96}
              height={24}
              priority
              className="h-5 w-auto object-contain"
            />
          </Link>
          <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">
            <div className="max-w-xl truncate text-sm font-semibold text-slate-700" title={title}>
              {title}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)]">
        <aside className="hidden w-64 shrink-0 border-r border-[#132942] bg-[#0B1A2B] text-white md:flex md:flex-col">
          <div className="border-b border-white/10 px-5 py-4">
            <Link href="/dashboard/cases" className="text-xs font-semibold text-white/60 hover:text-white">
              Cases
            </Link>
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
                  prefetch
                  className={[
                    "flex items-center border-l-2 px-3 py-2.5 text-sm font-medium transition",
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

        <main className="min-w-0 flex-1">
          <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <MobileCaseMenu caseId={caseId} title={title} active={active} />
              <div className="min-w-0 truncate text-sm font-semibold" title={title}>{title}</div>
            </div>
          </div>
          <div>{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AssistantPanel({ caseId }: { caseId: string }) {
  return (
    <Link href={`/dashboard/cases/${caseId}/chat`} className="inline-flex rounded-lg bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10243A]">
      McKenzie Friend AI
    </Link>
  );
}
