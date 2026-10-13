import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { attachPdf, friendlyError, uniqueSlug } from "@/lib/data/admin";
import { autoMap, buildPreview, parseInput, TARGET_FIELDS, type Mapping, type PreviewRow, type RawRow } from "@/lib/import";
import { fieldCls } from "@/components/admin/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/admin/import")({ component: ImportPage });

function ImportPage() {
  const qc = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [raw, setRaw] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const divisions = useQuery({ queryKey: ["admin-divisions-lite"], queryFn: async () => (await supabase.from("divisions").select("id,slug,name,short_name").order("sort_order")).data ?? [] });
  const batches = useQuery({ queryKey: ["import-batches"], queryFn: async () => (await supabase.from("import_batches").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [] });
  const headers = raw.length ? Object.keys(raw[0]) : [];

  const onFile = async (f?: File) => {
    if (!f) return;
    const fmt = f.name.toLowerCase().endsWith(".json") ? "json" : "csv";
    try {
      const rows = parseInput(await f.text(), fmt);
      if (!rows.length) return toast.error("No records found in file.");
      setFormat(fmt); setFileName(f.name); setRaw(rows); setMapping(autoMap(Object.keys(rows[0]))); setPreview(null);
    } catch (e) { toast.error(`Couldn't parse file: ${(e as Error).message}`); }
  };

  const runPreview = async () => {
    const { data, error } = await supabase.from("publications").select("id,title,year,doi,source_id");
    if (error) return toast.error(friendlyError(error));
    setPreview(buildPreview(raw, mapping, data, divisions.data ?? []));
  };

  const commit = async () => {
    if (!preview) return;
    const rows = preview.filter((r) => r.include);
    if (!rows.length) return toast.error("No records selected.");
    if (!window.confirm(`Import ${rows.length} record(s) as “In review”? Nothing will be published.`)) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: batch, error } = await supabase.from("import_batches").insert({ created_by: u.user?.id, file_name: fileName, format, total: preview.length }).select("id").single();
      if (error) throw error;
      const { data: researchers } = await supabase.from("researchers").select("id,name");
      const byName = new Map((researchers ?? []).map((r) => [r.name.toLowerCase().replace(/^dr\.?\s+/, ""), r.id]));
      let inserted = 0, rejected = 0;
      const records: { batch_id: string; row_number: number; source_id: string | null; title: string; outcome: string; message: string | null; publication_id: string | null }[] = [];
      for (const r of preview) {
        if (!r.include) { records.push({ batch_id: batch.id, row_number: r.row, source_id: r.source_id, title: r.title, outcome: r.duplicateOf ? "duplicate" : "rejected", message: r.duplicateOf ? `Duplicate of ${r.duplicateOf}` : r.errors.join("; ") || "Excluded by admin", publication_id: null }); continue; }
        try {
          const { data: p, error: e1 } = await supabase.from("publications").insert({
            slug: await uniqueSlug("publications", r.title), title: r.title, abstract: r.abstract, pub_date: r.pub_date, venue: r.venue, doi: r.doi,
            status: "in_review", source_system: "legacy", source_id: r.source_id, import_batch_id: batch.id, created_by: u.user?.id,
          }).select("id").single();
          if (e1) throw e1;
          if (r.authors.length) await supabase.from("publication_authors").insert(r.authors.map((a, i) => ({ publication_id: p.id, position: i + 1, author_name: a, researcher_id: byName.get(a.toLowerCase().replace(/^dr\.?\s+/, "")) ?? null })));
          if (r.divisionIds.length) await supabase.from("publication_divisions").insert(r.divisionIds.map((d) => ({ publication_id: p.id, division_id: d })));
          let msg: string | null = r.warnings.join("; ") || null;
          const pdf = r.pdf_file ? pdfs.find((f) => f.name === r.pdf_file) : undefined;
          if (r.pdf_file && !pdf) msg = [msg, `PDF “${r.pdf_file}” not supplied`].filter(Boolean).join("; ");
          if (pdf) { try { await attachPdf(p.id, pdf, null); } catch (e) { msg = [msg, `PDF failed: ${(e as Error).message}`].filter(Boolean).join("; "); } }
          inserted++;
          records.push({ batch_id: batch.id, row_number: r.row, source_id: r.source_id, title: r.title, outcome: "inserted", message: msg, publication_id: p.id });
        } catch (e) {
          rejected++;
          records.push({ batch_id: batch.id, row_number: r.row, source_id: r.source_id, title: r.title, outcome: "error", message: friendlyError(e), publication_id: null });
        }
      }
      await supabase.from("import_records").insert(records);
      await supabase.from("import_batches").update({ inserted, rejected, skipped: preview.length - inserted - rejected, status: rejected ? "partial" : "committed" }).eq("id", batch.id);
      toast.success(`Imported ${inserted} record(s) for review. ${rejected} failed.`);
      setPreview(null); setRaw([]);
      batches.refetch(); qc.invalidateQueries({ queryKey: ["admin-publications"] });
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  };

  const rollback = async (id: string) => {
    if (!window.confirm("Delete every publication created by this import batch?")) return;
    const { data: pubs } = await supabase.from("publications").select("id,pdf_path").eq("import_batch_id", id);
    const paths = (pubs ?? []).map((p) => p.pdf_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("publication-pdfs").remove(paths);
    const { error } = await supabase.from("publications").delete().eq("import_batch_id", id);
    if (error) return toast.error(friendlyError(error));
    await supabase.from("import_batches").update({ status: "rolled_back" }).eq("id", id);
    toast.success("Batch rolled back."); batches.refetch();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Import publications</h1>
      <p className="mt-1 text-sm text-muted-foreground">Upload a CSV or JSON export plus matching PDFs. Records are checked for duplicates and enter “In review” — nothing is published automatically.</p>
      <div className="mt-6 flex flex-wrap gap-4">
        <label className="text-sm">Metadata file<input type="file" accept=".csv,.json" className="mt-1 block text-sm" onChange={(e) => onFile(e.target.files?.[0])} /></label>
        <label className="text-sm">PDF files (optional)<input type="file" accept=".pdf" multiple className="mt-1 block text-sm" onChange={(e) => setPdfs([...(e.target.files ?? [])])} /></label>
      </div>

      {raw.length > 0 && (
        <section className="mt-8 rounded-md border border-border p-4">
          <h2 className="font-medium">Map fields · {raw.length} records from {fileName}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {TARGET_FIELDS.map((f) => (
              <label key={f.key} className="text-xs">{f.label}
                <select className={`${fieldCls} mt-1`} value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value || undefined })}>
                  <option value="">— not mapped —</option>{headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          <Button className="mt-4" onClick={runPreview} disabled={!mapping.title}>Validate & preview</Button>
        </section>
      )}

      {preview && (
        <section className="mt-8">
          <p className="text-sm">
            <span className="text-success">{preview.filter((r) => r.include).length} to import</span> · <span className="text-warning">{preview.filter((r) => r.duplicateOf).length} duplicates</span> · <span className="text-destructive">{preview.filter((r) => r.errors.length).length} invalid</span>
          </p>
          <div className="mt-3 overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[800px] text-xs">
              <thead className="bg-surface text-left"><tr><th className="p-2">Import</th><th className="p-2">#</th><th className="p-2">Title</th><th className="p-2">Divisions</th><th className="p-2">Issues</th></tr></thead>
              <tbody className="divide-y divide-border">
                {preview.map((r, i) => (
                  <tr key={r.row}>
                    <td className="p-2"><Checkbox disabled={r.errors.length > 0} checked={r.include} onCheckedChange={(c) => setPreview(preview.map((x, j) => (j === i ? { ...x, include: !!c } : x)))} /></td>
                    <td className="p-2 font-mono">{r.row}</td>
                    <td className="max-w-xs p-2">{r.title || <em>untitled</em>}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">{divisions.data?.map((d) => (
                        <label key={d.id} className="flex items-center gap-1"><Checkbox checked={r.divisionIds.includes(d.id)} onCheckedChange={(c) => setPreview(preview.map((x, j) => (j === i ? { ...x, divisionIds: c ? [...x.divisionIds, d.id] : x.divisionIds.filter((y) => y !== d.id) } : x)))} />{d.short_name}</label>
                      ))}</div>
                    </td>
                    <td className="p-2">
                      {r.duplicateOf && <p className="text-warning">Duplicate {r.duplicateOf.startsWith("file:") ? `of row ${r.duplicateOf.slice(5)}` : "of existing record"}</p>}
                      {r.errors.map((e) => <p key={e} className="text-destructive">{e}</p>)}
                      {r.warnings.map((w) => <p key={w} className="text-muted-foreground">{w}</p>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button className="mt-4" onClick={commit} disabled={busy}>{busy ? "Importing…" : "Import selected"}</Button>
        </section>
      )}

      <h2 className="mt-12 font-medium">Import history</h2>
      <ul className="mt-3 divide-y divide-border rounded-md border border-border text-sm">
        {batches.data?.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>{b.file_name} · {new Date(b.created_at).toLocaleString()} · {b.inserted} imported, {b.skipped} skipped, {b.rejected} failed · <span className="font-mono text-xs uppercase">{b.status}</span></span>
            {b.status !== "rolled_back" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => rollback(b.id)}>Roll back</Button>}
          </li>
        ))}
        {!batches.data?.length && <li className="p-3 text-muted-foreground">No imports yet.</li>}
      </ul>
    </div>
  );
}
