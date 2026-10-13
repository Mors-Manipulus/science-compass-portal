// Admin data access. All writes go through the signed-in user's session;
// database and storage policies reject anyone without an owner/admin role.
import { createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const BUCKET = "publication-pdfs";

export type StaffCtx = { userId: string; email: string; roles: ("owner" | "admin")[]; isOwner: boolean };
export const StaffContext = createContext<StaffCtx | null>(null);
export function useStaff() {
  const c = useContext(StaffContext);
  if (!c) throw new Error("useStaff outside admin");
  return c;
}

export async function validatePdf(file: File): Promise<string | null> {
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf"))
    return `“${file.name}” is not a PDF file.`;
  if (file.size > MAX_PDF_BYTES)
    return `“${file.name}” is ${(file.size / 1048576).toFixed(1)} MB — the limit is 25 MB.`;
  if (file.size === 0) return `“${file.name}” is empty.`;
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...head) !== "%PDF-") return `“${file.name}” does not look like a valid PDF.`;
  return null;
}

/** Upload with progress. Returns the storage path. */
export async function uploadPdfFile(publicationId: string, file: File, onProgress?: (pct: number) => void) {
  const err = await validatePdf(file);
  if (err) throw new Error(err);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const base = file.name.replace(/\.pdf$/i, "");
  const path = `${publicationId}/${Date.now()}-${slugify(base) || "paper"}.pdf`;
  const url = `${import.meta.env['VITE_SUPABASE_URL']}/storage/v1/object/${BUCKET}/${path}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY']);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let msg = `Upload failed (${xhr.status}).`;
        try { msg = JSON.parse(xhr.responseText).message ?? msg; } catch { /* ignore */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Please retry."));
    xhr.send(file);
  });
  return path;
}

/** Upload, attach to the record, then remove the previous file. Rolls back the upload if attaching fails. */
export async function attachPdf(publicationId: string, file: File, previousPath: string | null, onProgress?: (p: number) => void) {
  const path = await uploadPdfFile(publicationId, file, onProgress);
  const { error } = await supabase
    .from("publications")
    .update({ pdf_path: path, pdf_name: file.name, pdf_size: file.size })
    .eq("id", publicationId);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
  if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath]);
  return path;
}

export async function removePdf(publicationId: string, path: string) {
  const { error } = await supabase.from("publications").update({ pdf_path: null, pdf_name: null, pdf_size: null }).eq("id", publicationId);
  if (error) throw new Error(error.message);
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function uniqueSlug(table: "publications" | "researchers" | "projects" | "news", base: string, excludeId?: string) {
  const root = slugify(base) || "item";
  let slug = root;
  for (let i = 2; i < 50; i++) {
    let q = supabase.from(table).select("id").eq("slug", slug);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export function friendlyError(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/violates foreign key constraint/i.test(m)) return "This record is still referenced by other content. Deactivate or archive it instead.";
  if (/duplicate key|unique/i.test(m)) return "A record with the same identifier (slug, DOI or name) already exists.";
  if (/row-level security|permission denied/i.test(m)) return "You don't have permission to do that.";
  return m;
}
