import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/data/admin";
import { EditorDialog, Field, listToText, textToList } from "@/components/admin/EditorDialog";
import { fieldCls } from "@/components/admin/bits";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/admin/divisions")({ component: AdminDivisions });

type F = { id: string; name: string; short_name: string; tagline: string; description: string; focus_areas: string; lead_name: string; sort_order: number; active: boolean };

function AdminDivisions() {
  const qc = useQueryClient();
  const [form, setForm] = useState<F | null>(null);
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);
  const list = useQuery({
    queryKey: ["admin-divisions-full"],
    queryFn: async () => (await supabase.from("divisions").select("*,publication_divisions(publication_id),researcher_divisions(researcher_id)").order("sort_order")).data ?? [],
  });

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.short_name.trim()) return toast.error("Name and short name are required.");
    setSaving(true);
    const { id, ...rest } = form;
    const { error } = await supabase.from("divisions").update({ ...rest, focus_areas: textToList(form.focus_areas), lead_name: form.lead_name || null }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Division saved.");
    setForm(null);
    qc.invalidateQueries();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Divisions</h1>
      <p className="mt-1 text-sm text-muted-foreground">The six established divisions. IDs and URLs stay stable; divisions with linked content can be hidden but not deleted.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {list.data?.map((d) => (
          <button key={d.id} onClick={() => { const f = { id: d.id, name: d.name, short_name: d.short_name, tagline: d.tagline, description: d.description, focus_areas: listToText(d.focus_areas), lead_name: d.lead_name ?? "", sort_order: d.sort_order, active: d.active }; setForm(f); setInitial(JSON.stringify(f)); }}
            className="rounded-md border border-border bg-surface p-5 text-left hover:border-primary/40">
            <p className="font-mono text-xs text-muted-foreground">/{d.slug} {d.active ? "" : "· hidden"}</p>
            <p className="mt-1 font-semibold">{d.name}</p>
            <p className="text-sm text-coral">{d.tagline}</p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">{d.publication_divisions.length} papers · {d.researcher_divisions.length} researchers · Lead: {d.lead_name ?? "—"}</p>
          </button>
        ))}
      </div>
      {form && (
        <EditorDialog open title="Edit division" dirty={JSON.stringify(form) !== initial} saving={saving} onClose={() => setForm(null)} onSave={save}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *"><input className={fieldCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Short name *"><input className={fieldCls} value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></Field>
          </div>
          <Field label="Tagline"><input className={fieldCls} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
          <Field label="Description"><textarea rows={5} className={fieldCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Focus areas" hint="Comma-separated"><input className={fieldCls} value={form.focus_areas} onChange={(e) => setForm({ ...form, focus_areas: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Division lead"><input className={fieldCls} value={form.lead_name} onChange={(e) => setForm({ ...form, lead_name: e.target.value })} /></Field>
            <Field label="Display order"><input type="number" className={fieldCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: !!c })} /> Visible on public site</label>
        </EditorDialog>
      )}
    </div>
  );
}
