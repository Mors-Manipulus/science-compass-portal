import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { attachPdf, friendlyError, removePdf, uniqueSlug, validatePdf } from "@/lib/data/admin";
import { getPdfUrl } from "@/lib/data/public";
import { fieldCls, StatusBadge } from "@/components/admin/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/publications/$id")({
  component: EditPublication,
});

type Status = "draft" | "in_review" | "published" | "archived";
type Form = {
  title: string; abstract: string; pub_date: string; venue: string; doi: string;
  status: Status; visibility: "public" | "private"; featured: boolean;
  authors: { name: string; researcher_id: string | null }[];
  divisionIds: string[];
};
const EMPTY: Form = { title: "", abstract: "", pub_date: "", venue: "", doi: "", status: "draft", visibility: "public", featured: false, authors: [], divisionIds: [] };

function EditPublication() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const lookups = useQuery({
    queryKey: ["admin-lookups"],
    queryFn: async () => {
      const [d, r] = await Promise.all([
        supabase.from("divisions").select("id,short_name,name").order("sort_order"),
        supabase.from("researchers").select("id,name,active").order("name"),
      ]);
      return { divisions: d.data ?? [], researchers: r.data ?? [] };
    },
  });

  const record = useQuery({
    queryKey: ["admin-publication", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("*,publication_authors(position,author_name,researcher_id),publication_divisions(division_id)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Form>(EMPTY);
  const initial = useRef<string>(JSON.stringify(EMPTY));
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<"pdf" | "record" | null>(null);

  useEffect(() => {
    const r = record.data;
    if (!r) return;
    const f: Form = {
      title: r.title, abstract: r.abstract, pub_date: r.pub_date ?? "", venue: r.venue ?? "", doi: r.doi ?? "",
      status: r.status, visibility: r.visibility, featured: r.featured,
      authors: [...r.publication_authors].sort((a, b) => a.position - b.position).map((a) => ({ name: a.author_name, researcher_id: a.researcher_id })),
      divisionIds: r.publication_divisions.map((d) => d.division_id),
    };
    setForm(f);
    initial.current = JSON.stringify(f);
  }, [record.data]);

  const dirty = JSON.stringify(form) !== initial.current || !!pendingFile;
  useBlocker({ shouldBlockFn: () => dirty && !window.confirm("You have unsaved changes. Leave anyway?"), enableBeforeUnload: () => dirty });

  const up = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Title is required.");
  if (form.doi && !/^10\.\d{4,9}\/\S+$/.test(form.doi.trim())) errors.push("DOI should look like 10.xxxx/yyyy (without https://doi.org/).");
  if (form.authors.some((a) => !a.name.trim())) errors.push("Every author needs a name.");
  const warnings: string[] = [];
  if (!form.divisionIds.length) warnings.push("No division assigned — this paper will show as Unassigned.");
  if (form.status === "published" && !form.abstract.trim()) warnings.push("Publishing without an abstract.");
  if (form.status === "published" && !form.pub_date) warnings.push("Publishing without a date.");

  const save = async () => {
    if (errors.length) return toast.error(errors[0]);
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(), abstract: form.abstract.trim(), pub_date: form.pub_date || null,
        venue: form.venue.trim() || null, doi: form.doi.trim() || null,
        status: form.status, visibility: form.visibility, featured: form.featured,
      };
      let pubId = id;
      if (isNew) {
        const slug = await uniqueSlug("publications", form.title);
        const { data: u } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("publications").insert({ ...payload, slug, created_by: u.user?.id ?? null }).select("id").single();
        if (error) throw error;
        pubId = data.id;
      } else {
        const { error } = await supabase.from("publications").update(payload).eq("id", id);
        if (error) throw error;
      }
      // Replace authors & divisions
      const del1 = await supabase.from("publication_authors").delete().eq("publication_id", pubId);
      if (del1.error) throw del1.error;
      if (form.authors.length) {
        const { error } = await supabase.from("publication_authors").insert(
          form.authors.map((a, i) => ({ publication_id: pubId, position: i + 1, author_name: a.name.trim(), researcher_id: a.researcher_id })),
        );
        if (error) throw error;
      }
      const del2 = await supabase.from("publication_divisions").delete().eq("publication_id", pubId);
      if (del2.error) throw del2.error;
      if (form.divisionIds.length) {
        const { error } = await supabase.from("publication_divisions").insert(form.divisionIds.map((d) => ({ publication_id: pubId, division_id: d })));
        if (error) throw error;
      }
      if (pendingFile) {
        setProgress(0);
        try {
          await attachPdf(pubId, pendingFile, record.data?.pdf_path ?? null, setProgress);
          setPendingFile(null);
        } catch (e) {
          toast.error(`Saved, but the PDF upload failed: ${(e as Error).message}`);
        } finally { setProgress(null); }
      }
      initial.current = JSON.stringify(form);
      setPendingFile(null);
      qc.invalidateQueries({ queryKey: ["admin-publications"] });
      qc.invalidateQueries({ queryKey: ["publications"] });
      qc.invalidateQueries({ queryKey: ["publication"] });
      qc.invalidateQueries({ queryKey: ["division"] });
      toast.success(isNew ? "Publication created." : "Changes saved.");
      if (isNew) navigate({ to: "/admin/publications/$id", params: { id: pubId }, replace: true });
      else record.refetch();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally { setSaving(false); }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const err = await validatePdf(f);
    if (err) return toast.error(err);
    setPendingFile(f);
  };

  const uploadNow = async () => {
    if (!pendingFile || isNew) return;
    setProgress(0);
    try {
      await attachPdf(id, pendingFile, record.data?.pdf_path ?? null, setProgress);
      toast.success(record.data?.pdf_path ? "PDF replaced." : "PDF uploaded.");
      setPendingFile(null);
      record.refetch();
      qc.invalidateQueries({ queryKey: ["admin-publications"] });
    } catch (e) { toast.error((e as Error).message + " You can retry."); }
    finally { setProgress(null); }
  };

  const doDelete = async () => {
    try {
      if (confirmDelete === "pdf" && record.data?.pdf_path) {
        await removePdf(id, record.data.pdf_path);
        toast.success("PDF removed.");
        record.refetch();
      } else if (confirmDelete === "record") {
        if (record.data?.pdf_path) await supabase.storage.from("publication-pdfs").remove([record.data.pdf_path]);
        const { error } = await supabase.from("publications").delete().eq("id", id);
        if (error) throw error;
        initial.current = JSON.stringify(form); setPendingFile(null);
        toast.success("Publication deleted.");
        qc.invalidateQueries({ queryKey: ["admin-publications"] });
        navigate({ to: "/admin/publications" });
      }
    } catch (e) { toast.error(friendlyError(e)); }
  };

  if (!isNew && record.isPending) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isNew && !record.data) return <p className="text-sm">Publication not found. <Link to="/admin/publications" className="text-primary">Back</Link></p>;

  const researchers = lookups.data?.researchers ?? [];

  return (
    <div className="max-w-4xl">
      <Link to="/admin/publications" className="font-mono text-xs text-muted-foreground hover:text-primary">← All publications</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{isNew ? "New publication" : "Edit publication"}</h1>
        <div className="flex items-center gap-2">
          {!isNew && record.data && <StatusBadge status={record.data.status} visibility={record.data.visibility} />}
          {!isNew && record.data && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/publications/${record.data.slug}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /> Preview</a>
            </Button>
          )}
        </div>
      </div>
      {!isNew && record.data?.source_id && <p className="mt-1 font-mono text-xs text-muted-foreground">Imported · source {record.data.source_system}:{record.data.source_id}</p>}

      <div className="mt-8 space-y-6">
        <div className="space-y-1.5"><Label htmlFor="t">Title *</Label><input id="t" className={fieldCls} value={form.title} onChange={(e) => up("title", e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="a">Abstract</Label><textarea id="a" rows={7} className={fieldCls} value={form.abstract} onChange={(e) => up("abstract", e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="d">Publication date</Label><input id="d" type="date" className={fieldCls} value={form.pub_date} onChange={(e) => up("pub_date", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="v">Journal / conference</Label><input id="v" className={fieldCls} value={form.venue} onChange={(e) => up("venue", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="doi">DOI</Label><input id="doi" placeholder="10.1234/abcd" className={fieldCls} value={form.doi} onChange={(e) => up("doi", e.target.value)} /></div>
        </div>

        <fieldset className="rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium">Authors</legend>
          <ol className="space-y-2">
            {form.authors.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <input aria-label={`Author ${i + 1} name`} className={`${fieldCls} min-w-40 flex-1`} value={a.name} onChange={(e) => up("authors", form.authors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <select aria-label={`Author ${i + 1} profile`} className={`${fieldCls} w-56`} value={a.researcher_id ?? ""} onChange={(e) => {
                  const r = researchers.find((r) => r.id === e.target.value);
                  up("authors", form.authors.map((x, j) => (j === i ? { name: x.name || r?.name || "", researcher_id: e.target.value || null } : x)));
                }}>
                  <option value="">Not linked to a profile</option>
                  {researchers.map((r) => <option key={r.id} value={r.id}>{r.name}{r.active ? "" : " (inactive)"}</option>)}
                </select>
                <Button type="button" size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...form.authors]; const t = n[i]!; n[i] = n[i - 1]!; n[i - 1] = t; up("authors", n); }}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Move down" disabled={i === form.authors.length - 1} onClick={() => { const n = [...form.authors]; const t = n[i]!; n[i] = n[i + 1]!; n[i + 1] = t; up("authors", n); }}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Remove author" onClick={() => up("authors", form.authors.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
              </li>
            ))}
          </ol>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => up("authors", [...form.authors, { name: "", researcher_id: null }])}>Add author</Button>
        </fieldset>

        <fieldset className="rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium">Divisions</legend>
          <div className="flex flex-wrap gap-4">
            {lookups.data?.divisions.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.divisionIds.includes(d.id)} onCheckedChange={(c) => up("divisionIds", c ? [...form.divisionIds, d.id] : form.divisionIds.filter((x) => x !== d.id))} />
                {d.short_name}
              </label>
            ))}
          </div>
          {!form.divisionIds.length && <p className="mt-2 text-xs text-warning">Unassigned</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="st">Status</Label>
            <select id="st" className={fieldCls} value={form.status} onChange={(e) => up("status", e.target.value as Status)}>
              <option value="draft">Draft</option><option value="in_review">In review</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vis">Visibility</Label>
            <select id="vis" className={fieldCls} value={form.visibility} onChange={(e) => up("visibility", e.target.value as "public")}>
              <option value="public">Public (when published)</option><option value="private">Private</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm"><Checkbox checked={form.featured} onCheckedChange={(c) => up("featured", !!c)} /> Feature on home page</label>
        </div>
        <p className="text-xs text-muted-foreground">Only papers that are <strong>Published</strong> and <strong>Public</strong> — and their PDFs — are visible to visitors.</p>

        <fieldset className="rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium">PDF</legend>
          {record.data?.pdf_path ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono text-xs">{record.data.pdf_name} · {((record.data.pdf_size ?? 0) / 1048576).toFixed(1)} MB</span>
              <Button size="sm" variant="outline" onClick={async () => { try { window.open(await getPdfUrl(record.data!.pdf_path!), "_blank"); } catch (e) { toast.error((e as Error).message); } }}>Open</Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmDelete("pdf")}><Trash2 className="h-4 w-4" /> Remove</Button>
            </div>
          ) : <p className="text-sm text-muted-foreground">No PDF attached.</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm hover:border-primary/50">
              <Upload className="h-4 w-4" /> {record.data?.pdf_path ? "Choose replacement PDF" : "Choose PDF"}
              <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {pendingFile && <span className="text-xs">{pendingFile.name} ({(pendingFile.size / 1048576).toFixed(1)} MB)</span>}
            {pendingFile && !isNew && <Button size="sm" onClick={uploadNow} disabled={progress !== null}>Upload now</Button>}
            {pendingFile && <Button size="sm" variant="ghost" onClick={() => setPendingFile(null)}>Clear</Button>}
          </div>
          {progress !== null && <div className="mt-3"><Progress value={progress} /><p className="mt-1 font-mono text-xs">{progress}%</p></div>}
          <p className="mt-2 text-xs text-muted-foreground">PDF only, up to 25 MB.{isNew ? " The file uploads when you create the publication." : ""}</p>
        </fieldset>

        {(errors.length > 0 || warnings.length > 0) && (
          <ul className="space-y-1 text-sm">
            {errors.map((e) => <li key={e} className="text-destructive">• {e}</li>)}
            {warnings.map((w) => <li key={w} className="text-warning">• {w}</li>)}
          </ul>
        )}

        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-6">
          <Button onClick={save} disabled={saving || (!dirty && !isNew)}>{saving ? "Saving…" : isNew ? "Create publication" : "Save changes"}</Button>
          {!isNew && <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete("record")}><Trash2 className="h-4 w-4" /> Delete permanently</Button>}
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDelete === "pdf" ? "Remove this PDF?" : "Delete this publication?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete === "pdf" ? "The file will be permanently removed from storage." : "This permanently deletes the record, its author links, division assignments and PDF. Consider archiving instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
