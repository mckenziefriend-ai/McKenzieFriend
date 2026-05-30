import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CaseHomePage({ params }: { params: Promise<{ caseid: string }> }) {
  const { caseid } = await params;
  redirect(`/dashboard/cases/${caseid}/chat`);
}
