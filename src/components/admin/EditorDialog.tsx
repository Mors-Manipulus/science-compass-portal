import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Dialog with unsaved-change protection on close. */
export function EditorDialog({
  open, title, dirty, saving, onClose, onSave, children, footerExtra,
}: {
  open: boolean; title: string; dirty: boolean; saving: boolean;
  onClose: () => void; onSave: () => void; children: ReactNode; footerExtra?: ReactNode;
}) {
  const tryClose = () => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && tryClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">{children}</div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>{footerExtra}</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={tryClose}>Cancel</Button>
            <Button onClick={onSave} disabled={saving || !dirty}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const listToText = (a: string[]) => a.join(", ");
export const textToList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
export const linksToText = (l: unknown) =>
  (Array.isArray(l) ? (l as { label: string; url: string }[]) : []).map((x) => `${x.label} | ${x.url}`).join("\n");
export function textToLinks(s: string): { label: string; url: string }[] {
  return s.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label, url] = line.includes("|") ? line.split("|").map((x) => x.trim()) : [line, line];
    return { label, url };
  }).filter((l) => /^https?:\/\//.test(l.url));
}
