import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EvidencePage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid } = await params;
  redirect(`/dashboard/cases/${caseid}/documents#evidence`);
}
