import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, uniqueSlug } from "@/lib/data/admin";
import { EditorDialog, Field, linksToText, textToLinks } from "@/components/admin/EditorDialog";
import { fieldCls } from "@/components/admin/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/admin/projects")({ component: AdminProjects });

type Status = "planned" | "active" | "completed";
type F = { id?: string; title: string; summary: string; description: string; status: Status; start_year: string; image_url: string; links: string; featured: boolean; published: boolean; divisionIds: string[]; researcherIds: string[] };
const EMPTY: F = { title: "", summary: "", description: "", status: "active", start_year: "", image_url: "", links: "", featured: false, published: false, divisionIds: [], researcherIds: [] };

function AdminProjects() {
  const qc = useQueryClient();
  const [form, setForm] = useState<F | null>(null);
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);
  const lookups = useQuery({
    queryKey: ["admin-lookups"],
    queryFn: async () => {
      const [d, r] = await Promise.all([supabase.from("divisions").select("id,short_name,name").order("sort_order"), supabase.from("researchers").select("id,name,active").order("name")]);
      return { divisions: d.data ?? [], researchers: r.data ?? [] };
    },
  });
  const list = useQuery({ queryKey: ["admin-projects"], queryFn: async () => (await supabase.from("projects").select("*,project_divisions(division_id),project_researchers(researcher_id)").order("created_at")).data ?? [] });
  const open = (f: F) => { setForm(f); setInitial(JSON.stringify(f)); };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) return toast.error("Title is required.");
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), summary: form.summary, description: form.description, status: form.status, start_year: Number(form.start_year) || null, image_url: form.image_url || null, links: textToLinks(form.links), featured: form.featured, published: form.published };
      let id = form.id;
      if (id) { const { error } = await supabase.from("projects").update(payload).eq("id", id); if (error) throw error; }
      else { const { data, error } = await supabase.from("projects").insert({ ...payload, slug: await uniqueSlug("projects", form.title) }).select("id").single(); if (error) throw error; id = data.id; }
      await supabase.from("project_divisions").delete().eq("project_id", id);
      await supabase.from("project_researchers").delete().eq("project_id", id);
      if (form.divisionIds.length) { const { error } = await supabase.from("project_divisions").insert(form.divisionIds.map((d) => ({ project_id: id!, division_id: d }))); if (error) throw error; }
      if (form.researcherIds.length) { const { error } = await supabase.from("project_researchers").insert(form.researcherIds.map((r) => ({ project_id: id!, researcher_id: r }))); if (error) throw error; }
      toast.success("Project saved.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-projects"] }); qc.invalidateQueries({ queryKey: ["projects"] }); qc.invalidateQueries({ queryKey: ["project"] });
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!form?.id || !window.confirm(`Permanently delete “${form.title}”?`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", form.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Project deleted."); setForm(null); qc.invalidateQueries({ queryKey: ["admin-projects"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Projects</h1><Button onClick={() => open(EMPTY)}><Plus className="h-4 w-4" /> New project</Button></div>
      <ul className="mt-6 divide-y divide-border rounded-md border border-border">
        {list.data?.map((p) => (
          <li key={p.id}>
            <button className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-surface/60" onClick={() => open({
              id: p.id, title: p.title, summary: p.summary, description: p.description, status: p.status as Status, start_year: p.start_year ? String(p.start_year) : "", image_url: p.image_url ?? "", links: linksToText(p.links), featured: p.featured, published: p.published,
              divisionIds: p.project_divisions.map((d) => d.division_id), researcherIds: p.project_researchers.map((r) => r.researcher_id),
            })}>
              <span><span className="font-medium">{p.title}</span><span className="block text-xs text-muted-foreground">{p.summary}</span></span>
              <span className="shrink-0 font-mono text-xs">{p.published ? <span className="text-success">Published</span> : <span className="text-warning">Hidden</span>}</span>
            </button>
          </li>
        ))}
      </ul>
      {form && (
        <EditorDialog open title={form.id ? "Edit project" : "New project"} dirty={JSON.stringify(form) !== initial} saving={saving} onClose={() => setForm(null)} onSave={save}
          footerExtra={form.id && <Button variant="ghost" className="text-destructive" onClick={remove}>Delete</Button>}>
          <Field label="Title *"><input className={fieldCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Summary"><input className={fieldCls} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
          <Field label="Description"><textarea rows={5} className={fieldCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status"><select className={fieldCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option></select></Field>
            <Field label="Start year"><input className={fieldCls} inputMode="numeric" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} /></Field>
            <Field label="Image URL"><input className={fieldCls} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
          </div>
          <Field label="Verified links" hint="One per line: Label | https://…"><textarea rows={2} className={fieldCls} value={form.links} onChange={(e) => setForm({ ...form, links: e.target.value })} /></Field>
          <div><p className="mb-2 text-sm font-medium">Divisions</p><div className="flex flex-wrap gap-4">
            {lookups.data?.divisions.map((d) => <label key={d.id} className="flex items-center gap-2 text-sm"><Checkbox checked={form.divisionIds.includes(d.id)} onCheckedChange={(c) => setForm({ ...form, divisionIds: c ? [...form.divisionIds, d.id] : form.divisionIds.filter((x) => x !== d.id) })} />{d.short_name}</label>)}
          </div></div>
          <div><p className="mb-2 text-sm font-medium">Researchers</p><div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-3">
            {lookups.data?.researchers.map((r) => <label key={r.id} className="flex items-center gap-2 text-sm"><Checkbox checked={form.researcherIds.includes(r.id)} onCheckedChange={(c) => setForm({ ...form, researcherIds: c ? [...form.researcherIds, r.id] : form.researcherIds.filter((x) => x !== r.id) })} />{r.name}</label>)}
          </div></div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.published} onCheckedChange={(c) => setForm({ ...form, published: !!c })} /> Published</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.featured} onCheckedChange={(c) => setForm({ ...form, featured: !!c })} /> Featured</label>
          </div>
        </EditorDialog>
      )}
    </div>
  );
}
