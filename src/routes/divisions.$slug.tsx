import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Empty, PageHeader } from "@/components/site/SiteChrome";
import { PublicationRow } from "@/components/site/Publication";
import { divisionQuery } from "@/lib/data/public";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/divisions/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    const d = await queryClient.ensureQueryData(divisionQuery(params.slug));
    if (!d) throw notFound();
    return { name: d.division.name, description: d.division.description };
  },
  head: ({ loaderData }) =>
    loaderData ? seo(loaderData.name, loaderData.description.slice(0, 155)) : { meta: [{ title: "Division unavailable" }, { name: "robots", content: "noindex" }] },
  component: DivisionPage,
});

function DivisionPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(divisionQuery(slug));
  if (!data) return null;
  const { division: d, publications, researchers, projects, news } = data;
  return (
    <>
      <PageHeader eyebrow={d.tagline} title={d.name}>
        <p>{d.description}</p>
        {d.lead_name && <p className="mt-3 font-mono text-xs">Division lead · {d.lead_name}</p>}
      </PageHeader>
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="eyebrow mb-6">Publications ({publications.length})</h2>
          {publications.length ? publications.map((p) => <PublicationRow key={p.id} p={p} />) : <Empty>No published papers yet.</Empty>}
        </section>
        <aside className="space-y-10">
          <div>
            <h2 className="eyebrow mb-3">Focus areas</h2>
            <ul className="space-y-1.5 text-sm">{d.focus_areas.map((f) => <li key={f}>— {f}</li>)}</ul>
          </div>
          <div>
            <h2 className="eyebrow mb-3">Researchers</h2>
            <ul className="space-y-2">
              {researchers.map((r) => r && (
                <li key={r.id}>
                  <Link to="/researchers/$slug" params={{ slug: r.slug }} className="text-sm hover:text-primary">{r.name}</Link>
                  <p className="text-xs text-muted-foreground">{r.role_title}</p>
                </li>
              ))}
            </ul>
          </div>
          {projects.length > 0 && (
            <div>
              <h2 className="eyebrow mb-3">Projects</h2>
              <ul className="space-y-2 text-sm">
                {projects.map((p) => p && <li key={p.id}><Link to="/projects/$slug" params={{ slug: p.slug }} className="hover:text-primary">{p.title}</Link></li>)}
              </ul>
            </div>
          )}
          {news.length > 0 && (
            <div>
              <h2 className="eyebrow mb-3">News</h2>
              <ul className="space-y-2 text-sm">
                {news.map((n) => <li key={n.id}><Link to="/news/$slug" params={{ slug: n.slug }} className="hover:text-primary">{n.title}</Link></li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
