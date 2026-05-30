import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";

export const dynamic = "force-dynamic";

const categories = [
  "Court order",
  "Application/form",
  "Statement",
  "Letter/email",
  "Screenshot",
  "Evidence",
  "Other",
];

type DocumentRow = {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  summary: string | null;
  created_at: string | null;
};

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ caseid: string }>;
}) {
  const { caseid: caseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id,title")
    .eq("id", caseId)
    .single();
  if (!caseRow) redirect("/dashboard/cases");

  const { data: documents, error: documentsError } = await supabase
    .from("case_documents")
    .select(
      "id,file_name,storage_path,file_type,file_size,category,summary,created_at",
    )
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  const rows = documentsError
    ? []
    : ((documents as DocumentRow[] | null) ?? []);

  const docsWithUrls = await Promise.all(
    rows.map(async (doc) => {
      const { data } = await supabase.storage
        .from("case-documents")
        .createSignedUrl(doc.storage_path, 60 * 10);
      return { ...doc, signedUrl: data?.signedUrl ?? "" };
    }),
  );

  async function uploadDocument(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const file = formData.get("file") as File | null;
    const category =
      String(formData.get("category") ?? "Other").trim() || "Other";
    const summary = String(formData.get("summary") ?? "").trim();

    if (!file || file.size === 0)
      redirect(`/dashboard/cases/${caseId}/documents`);

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (file.type && !allowedTypes.includes(file.type)) {
      redirect(`/dashboard/cases/${caseId}/documents?error=filetype`);
    }

    const name = safeFileName(file.name || "document");
    const storagePath = `${user.id}/${caseId}/${Date.now()}-${name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const upload = await supabase.storage
      .from("case-documents")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (upload.error) {
      console.error("Document upload failed:", upload.error);
      redirect(`/dashboard/cases/${caseId}/documents?error=upload`);
    }

    const insert = await supabase.from("case_documents").insert({
      case_id: caseId,
      user_id: user.id,
      file_name: file.name,
      storage_path: storagePath,
      file_type: file.type || null,
      file_size: file.size,
      category,
      summary: summary || null,
    });

    if (insert.error) {
      console.error("Document record insert failed:", insert.error);
      await supabase.storage.from("case-documents").remove([storagePath]);
      redirect(`/dashboard/cases/${caseId}/documents?error=database`);
    }

    redirect(`/dashboard/cases/${caseId}/documents`);
  }

  async function updateDocumentSummary(formData: FormData) {
    "use server";

    const docId = String(formData.get("document_id") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const category =
      String(formData.get("category") ?? "Other").trim() || "Other";
    if (!docId) redirect(`/dashboard/cases/${caseId}/documents`);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase
      .from("case_documents")
      .update({ summary: summary || null, category })
      .eq("id", docId)
      .eq("case_id", caseId);

    redirect(`/dashboard/cases/${caseId}/documents`);
  }

  async function deleteDocument(formData: FormData) {
    "use server";

    const docId = String(formData.get("document_id") ?? "").trim();
    const storagePath = String(formData.get("storage_path") ?? "").trim();
    if (!docId) redirect(`/dashboard/cases/${caseId}/documents`);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase
      .from("case_documents")
      .delete()
      .eq("id", docId)
      .eq("case_id", caseId);
    if (storagePath)
      await supabase.storage.from("case-documents").remove([storagePath]);

    redirect(`/dashboard/cases/${caseId}/documents`);
  }

  return (
    <CaseWorkspaceShell
      caseId={caseId}
      title={caseRow.title}
      active="Documents"
    >
      <div className="space-y-5">
        {documentsError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm sm:rounded-3xl sm:p-6">
            Documents are not set up yet. Run the Phase 3 Supabase SQL file,
            then return to this page.
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Documents
              </h2>
              <p className="mt-1 text-sm text-slate-600">Files and evidence for this case.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {rows.length} files
            </div>
          </div>

          <form
            action={uploadDocument}
            className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-[#F7F9FB] p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
              <input
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#0B1A2B] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              <select
                name="category"
                defaultValue="Evidence"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20"
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>
            <textarea
              name="summary"
              rows={3}
              placeholder="Optional summary or note"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#88D2DC] focus:ring-4 focus:ring-[#88D2DC]/20"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-[#0B1A2B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10243A]"
              >
                Upload document
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h3 className="text-lg font-semibold">Files</h3>
          </div>

          {docsWithUrls.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {docsWithUrls.map((doc) => (
                <article key={doc.id} className="px-5 py-4 sm:px-6">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_130px_170px] lg:items-center">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{doc.file_name}</div>
                      <div className="mt-1 text-sm text-slate-600">{doc.summary || "No summary added."}</div>
                    </div>
                    <div className="text-sm text-slate-600">{doc.category || "Uncategorised"}</div>
                    <div className="text-sm text-slate-500">{doc.file_size ? formatBytes(doc.file_size) : "—"}</div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {doc.signedUrl ? (
                        <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                          View
                        </a>
                      ) : null}
                      <Link href={`/dashboard/cases/${caseId}/chat`} className="rounded-xl bg-[#0B1A2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#10243A]">
                        Ask
                      </Link>
                    </div>
                  </div>

                  <details className="mt-3 rounded-xl border border-slate-100 bg-[#F7F9FB] p-3">
                    <summary className="cursor-pointer text-sm font-semibold">Edit</summary>
                    <form action={updateDocumentSummary} className="mt-3 grid gap-3">
                      <input type="hidden" name="document_id" value={doc.id} />
                      <select name="category" defaultValue={doc.category || "Other"} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
                        {categories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                      <textarea name="summary" rows={3} defaultValue={doc.summary || ""} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" />
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white">Save</button>
                      </div>
                    </form>
                    <form action={deleteDocument} className="mt-3">
                      <input type="hidden" name="document_id" value={doc.id} />
                      <input type="hidden" name="storage_path" value={doc.storage_path} />
                      <button type="submit" className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">Delete</button>
                    </form>
                  </details>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-600">No documents uploaded yet.</div>
          )}
        </section>

        <section id="evidence" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Evidence</h3>
              <p className="mt-1 text-sm text-slate-600">Link files to events, statements and bundles.</p>
            </div>
            <button disabled className="rounded-xl bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white opacity-60">Coming soon</button>
          </div>
        </section>
      </div>
    </CaseWorkspaceShell>
  );
}
