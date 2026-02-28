import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ caseid: string }>;
}) {
  const { caseid } = await params;

  return {
    title: caseid ? `CASE ${caseid}` : "NO PARAMS",
  };
}

export default async function CaseTracer({
  params,
}: {
  params: Promise<{ caseid: string }>;
}) {
  const p = await params;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Case tracer</h1>
      <pre>{JSON.stringify(p, null, 2)}</pre>
    </div>
  );
}
