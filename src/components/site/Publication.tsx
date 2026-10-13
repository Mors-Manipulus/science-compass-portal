import { Link } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getPdfUrl } from "@/lib/data/public";
import { pubDivisions, sortedAuthors, type DivisionRef, type PublicationListItem } from "@/lib/data/types";

export function DivisionTag({ d }: { d: DivisionRef }) {
  return (
    <Link
      to="/divisions/$slug"
      params={{ slug: d.slug }}
      className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
    >
      {d.short_name}
    </Link>
  );
}

export function AuthorList({ p }: { p: PublicationListItem }) {
  const authors = sortedAuthors(p);
  return (
    <span className="text-sm text-muted-foreground">
      {authors.map((a, i) => (
        <span key={a.position}>
          {a.researchers ? (
            <Link to="/researchers/$slug" params={{ slug: a.researchers.slug }} className="text-foreground/85 hover:text-primary">
              {a.researchers.name}
            </Link>
          ) : (
            a.author_name
          )}
          {i < authors.length - 1 ? ", " : ""}
        </span>
      ))}
    </span>
  );
}

export function PdfActions({ p, size = "sm" }: { p: PublicationListItem; size?: "sm" | "lg" }) {
  const [busy, setBusy] = useState(false);
  if (!p.pdf_path) {
    return <span className="font-mono text-xs text-muted-foreground">PDF not yet available</span>;
  }
  const run = async (download: boolean) => {
    setBusy(true);
    const win = download ? null : window.open("about:blank", "_blank");
    try {
      const url = await getPdfUrl(p.pdf_path!, download ? p.pdf_name ?? `${p.slug}.pdf` : undefined);
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (e) {
      win?.close();
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const cls =
    size === "lg"
      ? "inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium"
      : "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium";
  return (
    <div className="flex flex-wrap gap-2">
      <button disabled={busy} onClick={() => run(false)} className={`${cls} bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60`}>
        <FileText className="h-3.5 w-3.5" /> View PDF
      </button>
      <button disabled={busy} onClick={() => run(true)} className={`${cls} border border-border hover:bg-accent disabled:opacity-60`}>
        <Download className="h-3.5 w-3.5" /> Download
      </button>
    </div>
  );
}

export function PublicationRow({ p }: { p: PublicationListItem }) {
  return (
    <article className="group border-b border-border py-6 first:pt-0">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
        <span>{p.pub_date ? new Date(p.pub_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "Undated"}</span>
        {p.venue && <><span aria-hidden>·</span><span>{p.venue}</span></>}
        <span className="flex flex-wrap gap-1.5">{pubDivisions(p).map((d) => <DivisionTag key={d.slug} d={d} />)}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug">
        <Link to="/publications/$slug" params={{ slug: p.slug }} className="hover:text-primary">
          {p.title}
        </Link>
      </h3>
      <div className="mt-1"><AuthorList p={p} /></div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.abstract}</p>
      <div className="mt-3"><PdfActions p={p} /></div>
    </article>
  );
}

export function PublicationCard({ p }: { p: PublicationListItem }) {
  return (
    <article className="flex flex-col rounded-md border border-border bg-surface p-5 transition-colors hover:border-primary/40">
      <div className="flex flex-wrap gap-1.5">{pubDivisions(p).map((d) => <DivisionTag key={d.slug} d={d} />)}</div>
      <h3 className="mt-3 font-semibold leading-snug">
        <Link to="/publications/$slug" params={{ slug: p.slug }} className="hover:text-primary">{p.title}</Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.abstract}</p>
      <p className="mt-auto pt-4 font-mono text-xs text-muted-foreground">{p.venue} {p.year ? `· ${p.year}` : ""}</p>
    </article>
  );
}
