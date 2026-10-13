import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, uniqueSlug } from "@/lib/data/admin";
import { EditorDialog, Field, linksToText, listToText, textToLinks, textToList } from "@/components/admin/EditorDialog";
import { fieldCls } from "@/components/admin/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/admin/researchers")({ component: AdminResearchers });

type F = { id?: string; name: string; role_title: string; bio: string; photo_url: string; affiliations: string; interests: string; links: string; active: boolean; divisionIds: string[] };
const EMPTY: F = { name: "", role_title: "", bio: "", photo_url: "", affiliations: "", interests: "", links: "", active: true, divisionIds: [] };

function AdminResearchers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<F | null>(null);
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);

  const divisions = useQuery({ queryKey: ["admin-divisions"], queryFn: async () => (await supabase.from("divisions").select("id,slug,short_name").order("sort_order")).data ?? [] });
  const list = useQuery({
    queryKey: ["admin-researchers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("researchers").select("*,researcher_divisions(division_id),publication_authors(id)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const open = (f: F) => { setForm(f); setInitial(JSON.stringify(f)); };
  const rows = (list.data ?? []).filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-researchers"] }); qc.invalidateQueries({ queryKey: ["researchers"] }); qc.invalidateQueries({ queryKey: ["admin-lookups"] }); };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return toast.error("Name is required.");
    const dup = list.data?.find((r) => r.name.trim().toLowerCase() === form.name.trim().toLowerCase() && r.id !== form.id);
    if (dup) return toast.error(`A profile for “${dup.name}” already exists.`);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), role_title: form.role_title.trim(), bio: form.bio.trim(), photo_url: form.photo_url.trim() || null,
        affiliations: textToList(form.affiliations), interests: textToList(form.interests), links: textToLinks(form.links), active: form.active,
      };
      let id = form.id;
      if (id) {
        const { error } = await supabase.from("researchers").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("researchers").insert({ ...payload, slug: await uniqueSlug("researchers", form.name.replace(/^Dr\.?\s+/i, "")) }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      await supabase.from("researcher_divisions").delete().eq("researcher_id", id);
      if (form.divisionIds.length) {
        const { error } = await supabase.from("researcher_divisions").insert(form.divisionIds.map((d) => ({ researcher_id: id!, division_id: d })));
        if (error) throw error;
      }
      toast.success("Researcher saved.");
      setForm(null);
      refresh();
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!form?.id || !window.confirm(`Permanently delete ${form.name}? Profiles linked to papers or projects can only be deactivated.`)) return;
    const { error } = await supabase.from("researchers").delete().eq("id", form.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Researcher deleted.");
    setForm(null); refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Researchers <span className="font-mono text-sm text-muted-foreground">({list.data?.length ?? 0})</span></h1>
        <Button onClick={() => open(EMPTY)}><Plus className="h-4 w-4" /> Add researcher</Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Researcher profiles are public content. They never grant dashboard access.</p>
      <input aria-label="Search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className={`${fieldCls} mt-6 max-w-sm`} />
      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface text-left font-mono text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Divisions</th><th className="p-3">Papers</th><th className="p-3">Status</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-surface/60" onClick={() => open({
                id: r.id, name: r.name, role_title: r.role_title, bio: r.bio, photo_url: r.photo_url ?? "", affiliations: listToText(r.affiliations),
                interests: listToText(r.interests), links: linksToText(r.links), active: r.active, divisionIds: r.researcher_divisions.map((d) => d.division_id),
              })}>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-muted-foreground">{r.role_title}</td>
                <td className="p-3">{r.researcher_divisions.map((d) => divisions.data?.find((x) => x.id === d.division_id)?.short_name).join(", ")}</td>
                <td className="p-3 font-mono text-xs">{r.publication_authors.length}</td>
                <td className="p-3 text-xs">{r.active ? <span className="text-success">Active</span> : <span className="text-muted-foreground">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <EditorDialog open title={form.id ? "Edit researcher" : "Add researcher"} dirty={JSON.stringify(form) !== initial} saving={saving} onClose={() => setForm(null)} onSave={save}
          footerExtra={form.id && <Button variant="ghost" className="text-destructive" onClick={remove}>Delete</Button>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *"><input className={fieldCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Role / designation"><input className={fieldCls} value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></Field>
          </div>
          <Field label="Biography"><textarea rows={4} className={fieldCls} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
          <Field label="Photo URL"><input className={fieldCls} value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Affiliations" hint="Comma-separated"><input className={fieldCls} value={form.affiliations} onChange={(e) => setForm({ ...form, affiliations: e.target.value })} /></Field>
            <Field label="Research interests" hint="Comma-separated"><input className={fieldCls} value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} /></Field>
          </div>
          <Field label="Professional links" hint="One per line: Label | https://…"><textarea rows={3} className={fieldCls} value={form.links} onChange={(e) => setForm({ ...form, links: e.target.value })} /></Field>
          <div>
            <p className="mb-2 text-sm font-medium">Divisions</p>
            <div className="flex flex-wrap gap-4">
              {divisions.data?.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm"><Checkbox checked={form.divisionIds.includes(d.id)} onCheckedChange={(c) => setForm({ ...form, divisionIds: c ? [...form.divisionIds, d.id] : form.divisionIds.filter((x) => x !== d.id) })} />{d.short_name}</label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: !!c })} /> Active (visible on the public site)</label>
        </EditorDialog>
      )}
    </div>
  );
}
