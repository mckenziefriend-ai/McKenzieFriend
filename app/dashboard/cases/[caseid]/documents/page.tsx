import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CaseWorkspaceShell } from "@/app/dashboard/components/CaseWorkspaceShell";
import UploadDocumentForm from "./UploadDocumentForm";
import { MAX_UPLOAD_BYTES } from "@/lib/uploadLimits";

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
    .eq("user_id", user.id)
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

    if (file.size > MAX_UPLOAD_BYTES) {
      redirect(`/dashboard/cases/${caseId}/documents?error=filesize`);
    }

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
    // Runs inside a "use server" action (request time), not during render, so
    // Date.now() here is not a render-purity concern.
    // eslint-disable-next-line react-hooks/purity
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
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-7">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <span className="text-sm text-slate-500">{rows.length} files</span>
        </div>

        {documentsError ? (
          <div className="mb-5 border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Documents are not set up yet. Run the Phase 3 Supabase SQL file.
          </div>
        ) : null}

        <UploadDocumentForm action={uploadDocument} categories={categories} />

        <div className="overflow-x-auto border border-slate-200 bg-white">
          <div className="grid min-w-[760px] grid-cols-[minmax(260px,1fr)_150px_110px_190px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Name</div>
            <div>Type</div>
            <div>Size</div>
            <div className="text-right">Actions</div>
          </div>
          {docsWithUrls.length > 0 ? (
            <div className="min-w-[760px] divide-y divide-slate-100">
              {docsWithUrls.map((doc) => (
                <div key={doc.id} className="grid grid-cols-[minmax(260px,1fr)_150px_110px_190px] items-start gap-4 px-4 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{doc.file_name}</div>
                    {doc.summary ? <div className="mt-1 text-sm text-slate-600">{doc.summary}</div> : null}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-500">Edit</summary>
                      <div className="mt-3 grid gap-3">
                        <form action={updateDocumentSummary} className="grid gap-3">
                          <input type="hidden" name="document_id" value={doc.id} />
                          <select name="category" defaultValue={doc.category || "Other"} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                            {categories.map((category) => (
                              <option key={category}>{category}</option>
                            ))}
                          </select>
                          <textarea name="summary" rows={2} defaultValue={doc.summary || ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                          <button type="submit" className="w-fit rounded-lg bg-[#0B1A2B] px-4 py-2 text-sm font-semibold text-white">Save</button>
                        </form>
                        <form action={deleteDocument}>
                          <input type="hidden" name="document_id" value={doc.id} />
                          <input type="hidden" name="storage_path" value={doc.storage_path} />
                          <button type="submit" className="text-sm font-semibold text-red-700 hover:underline">Delete</button>
                        </form>
                      </div>
                    </details>
                  </div>
                  <div className="text-sm text-slate-600">{doc.category || "Uncategorised"}</div>
                  <div className="text-sm text-slate-500">{doc.file_size ? formatBytes(doc.file_size) : "—"}</div>
                  <div className="flex justify-end gap-2">
                    {doc.signedUrl ? (
                      <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                        View
                      </a>
                    ) : null}
                    <Link href={`/dashboard/cases/${caseId}/chat`} className="rounded-lg bg-[#0B1A2B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#10243A]">
                      Chat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-sm text-slate-600">No documents uploaded yet.</div>
          )}
        </div>

        <div id="evidence" className="mt-8 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Evidence</h2>
            <button disabled className="rounded-lg bg-[#0B1A2B] px-4 py-2.5 text-sm font-semibold text-white opacity-50">Coming soon</button>
          </div>
        </div>
      </div>
    </CaseWorkspaceShell>
  );
}
