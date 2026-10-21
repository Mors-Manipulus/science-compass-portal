import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PUBLICATION_SELECT, pubDivisions, type PublicationListItem } from "@/lib/data/types";
import { friendlyError } from "@/lib/data/admin";
import { metadataIssues, StatusBadge } from "@/components/admin/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type S = { q?: string; status?: string; division?: string; year?: number; sort?: "date" | "title" | "updated" };

export const Route = createFileRoute("/_authenticated/admin/publications/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
    division: typeof s.division === "string" ? s.division : undefined,
    year: Number(s.year) || undefined,
    sort: s.sort === "title" || s.sort === "updated" ? s.sort : undefined,
  }),
  component: AdminPublications,
});

type Row = PublicationListItem & { updated_at: string };


const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function AdminPublications() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/publications/" });
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDivs, setBulkDivs] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<null | { label: string; run: () => Promise<void> }>(null);

  const divisions = useQuery({ queryKey: ["admin-divisions"], queryFn: async () => (await supabase.from("divisions").select("id,slug,short_name").order("sort_order")).data ?? [] });
  const pubs = useQuery({
    queryKey: ["admin-publications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("publications").select(`${PUBLICATION_SELECT},updated_at`).order("pub_date", { ascending: false, nullsFirst: true });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    let r = pubs.data ?? [];
    if (search.status) r = r.filter((p) => p.status === search.status);
    if (search.division === "unassigned") r = r.filter((p) => p.publication_divisions.length === 0);
    else if (search.division) r = r.filter((p) => pubDivisions(p).some((d) => d.slug === search.division));
    if (search.year) r = r.filter((p) => p.year === search.year);
    if (search.q) { const q = search.q.toLowerCase(); r = r.filter((p) => p.title.toLowerCase().includes(q) || p.publication_authors.some((a) => a.author_name.toLowerCase().includes(q))); }
    const sorted = [...r];
    if (search.sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    if (search.sort === "updated") sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return sorted;
  }, [pubs.data, search]);

  const years = [...new Set((pubs.data ?? []).map((p) => p.year).filter(Boolean) as number[])].sort((a, b) => b - a);
  const ids = [...selected].filter((id) => rows.some((r) => r.id === id));
  const set = (patch: Partial<S>) => navigate({ search: (s) => ({ ...s, ...patch }) });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-publications"] }); qc.invalidateQueries({ queryKey: ["publications"] }); };

  const bulkDivisions = async (mode: "add" | "replace" | "clear") => {
    try {
      if (mode !== "add") {
        const { error } = await supabase.from("publication_divisions").delete().in("publication_id", ids);
        if (error) throw error;
      }
      if (mode !== "clear" && bulkDivs.length) {
        const { error } = await supabase.from("publication_divisions").upsert(
          ids.flatMap((pid) => bulkDivs.map((did) => ({ publication_id: pid, division_id: did }))),
          { onConflict: "publication_id,division_id", ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      toast.success(`Updated divisions for ${ids.length} paper(s).`);
      setSelected(new Set());
      refresh();
    } catch (e) { toast.error(friendlyError(e)); }
  };
  const bulkStatus = async (status: "published" | "in_review" | "draft" | "archived") => {
    const { error } = await supabase.from("publications").update({ status }).in("id", ids);
    if (error) return toast.error(friendlyError(error));
    toast.success(`${ids.length} paper(s) set to ${status.replace("_", " ")}.`);
    setSelected(new Set());
    refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Publications</h1>
        <Button asChild><Link to="/admin/publications/$id" params={{ id: "new" }}><Plus className="h-4 w-4" /> New publication</Link></Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <input aria-label="Search" placeholder="Search title or author…" defaultValue={search.q} onChange={(e) => set({ q: e.target.value || undefined })} className={`${sel} min-w-56 flex-1`} />
        <select aria-label="Status" className={sel} value={search.status ?? ""} onChange={(e) => set({ status: e.target.value || undefined })}>
          <option value="">All statuses</option>
          {["published", "in_review", "draft", "archived"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select aria-label="Division" className={sel} value={search.division ?? ""} onChange={(e) => set({ division: e.target.value || undefined })}>
          <option value="">All divisions</option>
          <option value="unassigned">⚠ Unassigned</option>
          {divisions.data?.map((d) => <option key={d.id} value={d.slug}>{d.short_name}</option>)}
        </select>
        <select aria-label="Year" className={sel} value={search.year ?? ""} onChange={(e) => set({ year: Number(e.target.value) || undefined })}>
          <option value="">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label="Sort" className={sel} value={search.sort ?? "date"} onChange={(e) => set({ sort: e.target.value === "date" ? undefined : (e.target.value as S["sort"]) })}>
          <option value="date">Sort: date</option><option value="title">Sort: title</option><option value="updated">Sort: last edited</option>
        </select>
      </div>

      {ids.length > 0 && (
        <div className="sticky top-2 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-surface p-3 text-sm">
          <span className="font-medium">{ids.length} selected</span>
          <span className="mx-1 text-muted-foreground">|</span>
          {divisions.data?.map((d) => (
            <label key={d.id} className="flex items-center gap-1.5">
              <Checkbox checked={bulkDivs.includes(d.id)} onCheckedChange={(c) => setBulkDivs(c ? [...bulkDivs, d.id] : bulkDivs.filter((x) => x !== d.id))} />
              {d.short_name}
            </label>
          ))}
          <Button size="sm" variant="secondary" disabled={!bulkDivs.length} onClick={() => bulkDivisions("add")}>Add</Button>
          <Button size="sm" variant="secondary" disabled={!bulkDivs.length} onClick={() => setConfirm({ label: `Replace divisions on ${ids.length} paper(s) with the chosen divisions?`, run: () => bulkDivisions("replace") })}>Replace</Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirm({ label: `Mark ${ids.length} paper(s) as Unassigned?`, run: () => bulkDivisions("clear") })}>Unassign</Button>
          <span className="mx-1 text-muted-foreground">|</span>
          <select aria-label="Set status" className={sel} value="" onChange={(e) => { const v = e.target.value as "published"; if (v) setConfirm({ label: `Set ${ids.length} paper(s) to “${v.replace("_", " ")}”?`, run: async () => { await bulkStatus(v); } }); }}>
            <option value="">Set status…</option>
            {["published", "in_review", "draft", "archived"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-surface text-left font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-10 p-3"><Checkbox aria-label="Select all" checked={rows.length > 0 && ids.length === rows.length} onCheckedChange={(c) => setSelected(c ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
              <th className="p-3">Title</th><th className="p-3">Divisions</th><th className="p-3">Year</th><th className="p-3">Status</th><th className="p-3">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pubs.isPending && <tr><td colSpan={6} className="p-6 text-muted-foreground">Loading…</td></tr>}
            {rows.map((p) => {
              const issues = metadataIssues(p);
              return (
                <tr key={p.id} className="hover:bg-surface/60">
                  <td className="p-3"><Checkbox aria-label={`Select ${p.title}`} checked={selected.has(p.id)} onCheckedChange={(c) => { const n = new Set(selected); if (c) n.add(p.id); else n.delete(p.id); setSelected(n); }} /></td>
                  <td className="max-w-md p-3">
                    <Link to="/admin/publications/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.title}</Link>
                    <p className="truncate text-xs text-muted-foreground">{p.publication_authors.map((a) => a.author_name).join(", ")}</p>
                  </td>
                  <td className="p-3">{pubDivisions(p).length ? pubDivisions(p).map((d) => d.short_name).join(", ") : <span className="text-warning">Unassigned</span>}</td>
                  <td className="p-3 font-mono text-xs">{p.year ?? "—"}</td>
                  <td className="p-3"><StatusBadge status={p.status} visibility={p.visibility} /></td>
                  <td className="p-3 text-xs">
                    {issues.length ? <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" /> {issues.join(", ")}</span> : <span className="inline-flex items-center gap-1 text-success"><FileText className="h-3 w-3" /> complete</span>}
                  </td>
                </tr>
              );
            })}
            {!pubs.isPending && rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No publications match.</td></tr>}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm bulk change</AlertDialogTitle><AlertDialogDescription>{confirm?.label}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => confirm?.run()}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

