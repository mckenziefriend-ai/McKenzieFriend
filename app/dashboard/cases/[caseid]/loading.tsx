export default function CaseLoading() {
  return (
    <div className="min-h-screen bg-[#F7F9FB] p-4 text-[#0B1A2B] sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-28 animate-pulse rounded-3xl bg-white shadow-sm" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-4">
            <div className="h-36 animate-pulse rounded-3xl bg-white shadow-sm" />
            <div className="h-64 animate-pulse rounded-3xl bg-white shadow-sm" />
          </div>
          <div className="hidden h-56 animate-pulse rounded-3xl bg-white shadow-sm lg:block" />
        </div>
      </div>
    </div>
  );
}
