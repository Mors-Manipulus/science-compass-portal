import type { PublicationListItem } from "@/lib/data/types";

export function metadataIssues(p: PublicationListItem) {
  const out: string[] = [];
  if (!p.abstract) out.push("abstract");
  if (!p.pub_date) out.push("date");
  if (!p.publication_authors.length) out.push("authors");
  if (!p.publication_divisions.length) out.push("division");
  if (!p.pdf_path && !p.external_url) out.push("PDF");
  return out;
}

export function StatusBadge({ status, visibility }: { status: string; visibility?: string }) {
  const color =
    status === "published" ? "text-success border-success/40" : status === "archived" ? "text-muted-foreground border-border" : "text-warning border-warning/40";
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[0.68rem] uppercase ${color}`}>
      {status.replace("_", " ")}
      {visibility === "private" ? " · private" : ""}
    </span>
  );
}

export const fieldCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
