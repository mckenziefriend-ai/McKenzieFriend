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
  { label: "Export", href: "export" },
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
            <Image src="/logo.png" alt="McKenzie Friend AI" width={190} height={48} priority className="h-8 w-auto object-contain" />
          </Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href="/dashboard/cases" className="text-sm font-semibold text-slate-500 hover:text-[#0B1A2B]">
                ← Cases
              </Link>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/dashboard/cases/${caseId}/chat`} className="rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10243A]">
                Ask AI
              </Link>
              <Link href={`/dashboard/cases/${caseId}/chronology`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
                Add event
              </Link>
              <Link href={`/dashboard/cases/${caseId}/statements`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
                Statement
              </Link>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4">
            {tabs.map((tab) => {
              const href = tab.href ? `/dashboard/cases/${caseId}/${tab.href}` : `/dashboard/cases/${caseId}`;
              const isActive = tab.label === active;
              return (
                <Link
                  key={tab.label}
                  href={href}
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

        <div className={assistant ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" : ""}>
          <section>{children}</section>
          {assistant ? <AssistantPanel caseId={caseId} /> : null}
        </div>
      </main>
    </div>
  );
}

export function AssistantPanel({ caseId }: { caseId: string }) {
  return (
    <aside className="sticky top-6 h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#88D2DC]/30 text-sm font-bold text-[#0B1A2B]">AI</div>
        <div>
          <div className="text-sm font-semibold">Case Assistant</div>
          <div className="text-xs text-slate-500">Works with this case</div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {["What should I do next?", "Summarise this case", "Check what is missing", "Build a bundle", "Translate something"].map((prompt) => (
          <Link key={prompt} href={`/dashboard/cases/${caseId}/chat`} className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium hover:border-[#88D2DC] hover:bg-[#88D2DC]/10">
            {prompt}
          </Link>
        ))}
      </div>

      <Link href={`/dashboard/cases/${caseId}/chat`} className="mt-5 block rounded-2xl bg-[#0B1A2B] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#10243A]">
        Open chat
      </Link>
    </aside>
  );
}

export function ToolPlaceholder({ title, description, bullets }: { title: string; description: string; bullets: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {bullets.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-[#F7F9FB] p-4 text-sm font-medium text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
