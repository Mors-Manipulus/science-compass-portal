import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, uniqueSlug } from "@/lib/data/admin";
import { EditorDialog, Field } from "@/components/admin/EditorDialog";
import { fieldCls } from "@/components/admin/bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/admin/news")({ component: AdminNews });

type F = { id?: string; title: string; summary: string; body: string; image_url: string; published_at: string; published: boolean; division_id: string };
const today = () => new Date().toISOString().slice(0, 10);

function AdminNews() {
  const qc = useQueryClient();
  const [form, setForm] = useState<F | null>(null);
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);
  const divisions = useQuery({ queryKey: ["admin-divisions"], queryFn: async () => (await supabase.from("divisions").select("id,slug,short_name").order("sort_order")).data ?? [] });
  const list = useQuery({ queryKey: ["admin-news"], queryFn: async () => (await supabase.from("news").select("*").order("published_at", { ascending: false })).data ?? [] });
  const open = (f: F) => { setForm(f); setInitial(JSON.stringify(f)); };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) return toast.error("Title is required.");
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), summary: form.summary, body: form.body, image_url: form.image_url || null, published_at: new Date(form.published_at || today()).toISOString(), published: form.published, division_id: form.division_id || null };
      if (form.id) { const { error } = await supabase.from("news").update(payload).eq("id", form.id); if (error) throw error; }
      else { const { error } = await supabase.from("news").insert({ ...payload, slug: await uniqueSlug("news", form.title) }); if (error) throw error; }
      toast.success("Article saved.");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["admin-news"] }); qc.invalidateQueries({ queryKey: ["news"] }); qc.invalidateQueries({ queryKey: ["news-article"] });
    } catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!form?.id || !window.confirm(`Permanently delete “${form.title}”?`)) return;
    const { error } = await supabase.from("news").delete().eq("id", form.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Article deleted."); setForm(null); qc.invalidateQueries({ queryKey: ["admin-news"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">News</h1>
        <Button onClick={() => open({ title: "", summary: "", body: "", image_url: "", published_at: today(), published: false, division_id: "" })}><Plus className="h-4 w-4" /> New article</Button></div>
      <ul className="mt-6 divide-y divide-border rounded-md border border-border">
        {list.data?.map((n) => (
          <li key={n.id}>
            <button className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-surface/60" onClick={() => open({ id: n.id, title: n.title, summary: n.summary, body: n.body, image_url: n.image_url ?? "", published_at: n.published_at.slice(0, 10), published: n.published, division_id: n.division_id ?? "" })}>
              <span><span className="font-medium">{n.title}</span><span className="block font-mono text-xs text-muted-foreground">{n.published_at.slice(0, 10)}</span></span>
              <span className="shrink-0 font-mono text-xs">{n.published ? <span className="text-success">Published</span> : <span className="text-warning">Draft</span>}</span>
            </button>
          </li>
        ))}
      </ul>
      {form && (
        <EditorDialog open title={form.id ? "Edit article" : "New article"} dirty={JSON.stringify(form) !== initial} saving={saving} onClose={() => setForm(null)} onSave={save}
          footerExtra={form.id && <Button variant="ghost" className="text-destructive" onClick={remove}>Delete</Button>}>
          <Field label="Title *"><input className={fieldCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Summary"><input className={fieldCls} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
          <Field label="Body"><textarea rows={8} className={fieldCls} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Publish date"><input type="date" className={fieldCls} value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} /></Field>
            <Field label="Division"><select className={fieldCls} value={form.division_id} onChange={(e) => setForm({ ...form, division_id: e.target.value })}><option value="">Lab-wide</option>{divisions.data?.map((d) => <option key={d.id} value={d.id}>{d.short_name}</option>)}</select></Field>
            <Field label="Featured image URL"><input className={fieldCls} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.published} onCheckedChange={(c) => setForm({ ...form, published: !!c })} /> Published</label>
        </EditorDialog>
      )}
    </div>
  );
}
