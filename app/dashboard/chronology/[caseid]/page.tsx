import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const raw = Object.values(params)[0];
  const caseId = Array.isArray(raw) ? raw[0] : raw;

  return {
    title: caseId ? `CASE ${caseId}` : "NO PARAMS",
  };
}

export default async function CaseTracer({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  // If this page is matched, params will NOT be {}
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Case tracer</h1>
      <pre>{JSON.stringify(params, null, 2)}</pre>
    </div>
  );
}
