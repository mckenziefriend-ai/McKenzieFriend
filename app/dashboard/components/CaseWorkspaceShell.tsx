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
  { label: "Export", href: "export" },
];

export function CaseWorkspaceShell({
  caseId,
  title,
  eyebrow = "CASE WORKSPACE",
  active = "Hub",
  children,
  assistant = true,
}: {
  caseId: string;
  title: string;
  eyebrow?: string;
  active?: string;
  children: React.ReactNode;
  assistant?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#0B1A2B] dark:bg-[#07111F] dark:text-white">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-[#1F344D] dark:bg-[#0B1A2B]/90">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
            McKenzie Friend AI
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-[#1F344D]">Light / dark ready</span>
            <form action="/auth/signout" method="post">
              <button className="rounded-full border border-slate-200 px-3 py-1 font-semibold hover:bg-slate-50 dark:border-[#1F344D] dark:hover:bg-[#10243A]">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1F344D] dark:bg-[#0B1A2B] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href="/dashboard/cases" className="text-sm font-semibold text-slate-500 hover:text-[#0B1A2B] dark:text-slate-300 dark:hover:text-white">
                ← All cases
              </Link>
              <div className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#2B7C86] dark:text-[#88D2DC]">
                {eyebrow}
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                The case hub keeps your AI assistant, chronology, statements, documents, evidence, calendar and bundle in sync.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/cases/${caseId}/chronology`} className="rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10243A] dark:bg-[#88D2DC] dark:text-[#07111F]">
                Add event
              </Link>
              <Link href={`/dashboard/cases/${caseId}/statements`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-[#1F344D] dark:bg-[#10243A] dark:hover:bg-[#14304D]">
                Draft statement
              </Link>
              <Link href={`/dashboard/cases/${caseId}/bundle`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-[#1F344D] dark:bg-[#10243A] dark:hover:bg-[#14304D]">
                Build bundle
              </Link>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 pt-4 dark:border-[#1F344D]">
            {tabs.map((tab) => {
              const href = tab.href ? `/dashboard/cases/${caseId}/${tab.href}` : `/dashboard/cases/${caseId}`;
              const isActive = tab.label === active;
              return (
                <Link
                  key={tab.label}
                  href={href}
                  className={[
                    "whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-[#0B1A2B] text-white dark:bg-[#88D2DC] dark:text-[#07111F]"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#10243A]",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={assistant ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
          <section>{children}</section>
          {assistant ? <AssistantPanel caseId={caseId} /> : null}
        </div>
      </main>
    </div>
  );
}

export function AssistantPanel({ caseId }: { caseId: string }) {
  return (
    <aside className="sticky top-6 h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#1F344D] dark:bg-[#0B1A2B]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#88D2DC]/30 text-[#0B1A2B] dark:bg-[#88D2DC]/20 dark:text-[#88D2DC]">
          AI
        </div>
        <div>
          <div className="text-sm font-semibold">Case Assistant</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">Connected to this case</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-[#F6F8FA] p-4 text-sm text-slate-700 dark:border-[#1F344D] dark:bg-[#10243A] dark:text-slate-200">
        Ask anything about this case. The assistant is designed to work with your tools, documents, calendar, bundle and exports.
      </div>

      <div className="mt-5 space-y-2">
        {[
          "What should I do next?",
          "Summarise this case",
          "Check what is missing",
          "Help me build a bundle",
          "Translate this into another language",
        ].map((prompt) => (
          <Link
            key={prompt}
            href={`/dashboard/cases/${caseId}/chat`}
            className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium hover:border-[#88D2DC] hover:bg-[#88D2DC]/10 dark:border-[#1F344D] dark:hover:bg-[#10243A]"
          >
            {prompt}
          </Link>
        ))}
      </div>

      <Link href={`/dashboard/cases/${caseId}/chat`} className="mt-5 block rounded-2xl bg-[#0B1A2B] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#10243A] dark:bg-[#88D2DC] dark:text-[#07111F]">
        Open full chat
      </Link>
    </aside>
  );
}

export function ToolPlaceholder({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#1F344D] dark:bg-[#0B1A2B] sm:p-8">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#2B7C86] dark:text-[#88D2DC]">Coming into this workspace</div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {bullets.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-[#F6F8FA] p-4 text-sm font-medium text-slate-700 dark:border-[#1F344D] dark:bg-[#10243A] dark:text-slate-200">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
