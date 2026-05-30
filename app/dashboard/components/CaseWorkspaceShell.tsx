import Image from "next/image";
import Link from "next/link";

const tabs = [
  { label: "Hub", href: "" },
  { label: "Chat", href: "chat" },
  { label: "Chronology", href: "chronology" },
  { label: "Statements", href: "statements" },
  { label: "Documents", href: "documents" },
  { label: "Evidence", href: "evidence" },
  { label: "Calendar", href: "calendar" },
  { label: "Bundle", href: "bundle" },
];

export function CaseWorkspaceShell({
  caseId,
  title,
  active = "Hub",
  children,
  assistant = true,
}: {
  caseId: string;
  title: string;
  active?: string;
  children: React.ReactNode;
  assistant?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#0B1A2B]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" aria-label="Dashboard" className="inline-flex items-center">
            <Image src="/logo.png" alt="McKenzie Friend AI" width={135} height={34} priority className="h-6 w-auto object-contain sm:h-7" />
          </Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 sm:px-4 sm:text-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 lg:py-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link href="/dashboard/cases" className="text-sm font-semibold text-slate-500 hover:text-[#0B1A2B]">
                ← Cases
              </Link>
              <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              <Link href={`/dashboard/cases/${caseId}/chat`} className="rounded-xl bg-[#0B1A2B] px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#10243A]">
                Ask AI
              </Link>
              <Link href={`/dashboard/cases/${caseId}/chronology`} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold hover:bg-slate-50">
                Event
              </Link>
              <Link href={`/dashboard/cases/${caseId}/statements`} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold hover:bg-slate-50">
                Statement
              </Link>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const href = tab.href ? `/dashboard/cases/${caseId}/${tab.href}` : `/dashboard/cases/${caseId}`;
              const isActive = tab.label === active;
              return (
                <Link
                  key={tab.label}
                  href={href}
                  prefetch
                  className={[
                    "whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition",
                    isActive ? "bg-[#0B1A2B] text-white" : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={assistant ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" : ""}>
          <section className="min-w-0">{children}</section>
          {assistant ? <AssistantPanel caseId={caseId} /> : null}
        </div>
      </main>
    </div>
  );
}

export function AssistantPanel({ caseId }: { caseId: string }) {
  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 lg:sticky lg:top-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#88D2DC]/30 text-sm font-bold text-[#0B1A2B]">AI</div>
        <div>
          <div className="text-sm font-semibold">Case Assistant</div>
          <div className="text-xs text-slate-500">Connected to this case</div>
        </div>
      </div>
      <Link href={`/dashboard/cases/${caseId}/chat`} className="mt-4 block rounded-2xl bg-[#0B1A2B] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#10243A]">
        Open chat
      </Link>
    </aside>
  );
}
