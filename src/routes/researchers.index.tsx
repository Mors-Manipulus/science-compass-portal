import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Empty, PageHeader } from "@/components/site/SiteChrome";
import { divisionsQuery, researchersQuery } from "@/lib/data/public";
import { seo } from "@/lib/seo";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/researchers/")({
  head: () => seo("Researchers", "Directory of researchers and engineers at BlackSeaShark5 Labs."),
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(researchersQuery()), queryClient.ensureQueryData(divisionsQuery())]),
  component: Researchers,
});

function Researchers() {
  const { data } = useSuspenseQuery(researchersQuery());
  const { data: divisions } = useSuspenseQuery(divisionsQuery());
  const [q, setQ] = useState("");
  const [div, setDiv] = useState("");
  const list = useMemo(
    () =>
      data.filter(
        (r) =>
          (!q || `${r.name} ${r.role_title} ${r.interests.join(" ")}`.toLowerCase().includes(q.toLowerCase())) &&
          (!div || r.researcher_divisions.some((d) => d.divisions?.slug === div)),
      ),
    [data, q, div],
  );
  return (
    <>
      <PageHeader eyebrow="People" title="Researcher directory">{data.length} researchers and engineers across six divisions.</PageHeader>
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-3 md:flex-row">
          <input aria-label="Search researchers" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, role or interest…" className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
          <select aria-label="Filter by division" value={div} onChange={(e) => setDiv(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All divisions</option>
            {divisions.map((d) => <option key={d.slug} value={d.slug}>{d.short_name}</option>)}
          </select>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((r) => (
            <li key={r.id}>
              <Link to="/researchers/$slug" params={{ slug: r.slug }} className="flex h-full flex-col rounded-md border border-border p-5 transition-colors hover:border-primary/40">
                {r.photo_url ? (
                  <img src={r.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-accent font-mono text-sm text-primary">{initials(r.name)}</span>
                )}
                <p className="mt-4 font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.role_title}</p>
                <p className="mt-auto pt-4 font-mono text-[0.68rem] uppercase tracking-wider text-muted-foreground">
                  {r.researcher_divisions.map((d) => d.divisions?.short_name).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {list.length === 0 && <div className="mt-8"><Empty>No researchers match.</Empty></div>}
      </div>
    </>
  );
}
