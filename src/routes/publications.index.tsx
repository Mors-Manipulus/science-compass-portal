import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader, Empty } from "@/components/site/SiteChrome";
import { PublicationRow } from "@/components/site/Publication";
import { divisionsQuery, PAGE_SIZE, publicationsQuery, publicationYearsQuery, type PubSearch } from "@/lib/data/public";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/publications/")({
  validateSearch: (s: Record<string, unknown>): PubSearch => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    division: typeof s.division === "string" && s.division ? s.division : undefined,
    year: Number(s.year) || undefined,
    page: Number(s.page) > 1 ? Number(s.page) : undefined,
  }),
  head: () => seo("Publications", "Search the BlackSeaShark5 Labs publication library by division, year and keyword, with direct PDF access."),
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(divisionsQuery()), queryClient.ensureQueryData(publicationYearsQuery())]),
  component: Publications,
});

const selectCls = "h-10 rounded-md border border-input bg-background px-3 text-sm";

function Publications() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/publications/" });
  const { data: divisions } = useSuspenseQuery(divisionsQuery());
  const { data: years } = useSuspenseQuery(publicationYearsQuery());
  const { data, isPending, error } = useQuery(publicationsQuery(search));
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== q) navigate({ search: (s) => ({ ...s, q: q || undefined, page: undefined }), replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const page = search.page ?? 1;

  return (
    <>
      <PageHeader eyebrow="Library" title="Publications">
        Every paper approved for public release, across all six divisions.
      </PageHeader>
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search publications</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search titles, abstracts, venues…"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
          </label>
          <select
            aria-label="Filter by division"
            className={selectCls}
            value={search.division ?? ""}
            onChange={(e) => navigate({ search: (s) => ({ ...s, division: e.target.value || undefined, page: undefined }) })}
          >
            <option value="">All divisions</option>
            {divisions.map((d) => <option key={d.slug} value={d.slug}>{d.short_name}</option>)}
          </select>
          <select
            aria-label="Filter by year"
            className={selectCls}
            value={search.year ?? ""}
            onChange={(e) => navigate({ search: (s) => ({ ...s, year: Number(e.target.value) || undefined, page: undefined }) })}
          >
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <p className="mt-6 font-mono text-xs text-muted-foreground" aria-live="polite">
          {data ? `${data.total} publication${data.total === 1 ? "" : "s"}` : "Loading…"}
        </p>

        <div className="mt-6">
          {error && <Empty>Couldn't load publications. Please try again.</Empty>}
          {isPending && <div className="h-64 animate-pulse rounded-md bg-surface" />}
          {data && data.items.length === 0 && <Empty>No publications match these filters.</Empty>}
          {data?.items.map((p) => <PublicationRow key={p.id} p={p} />)}
        </div>

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
            <button
              disabled={page <= 1}
              onClick={() => navigate({ search: (s) => ({ ...s, page: page - 1 > 1 ? page - 1 : undefined }) })}
              className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-xs text-muted-foreground">Page {page} of {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => navigate({ search: (s) => ({ ...s, page: page + 1 }) })}
              className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </>
  );
}
