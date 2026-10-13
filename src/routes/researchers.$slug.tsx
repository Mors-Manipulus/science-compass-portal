import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Empty } from "@/components/site/SiteChrome";
import { DivisionTag, PublicationRow } from "@/components/site/Publication";
import { researcherQuery } from "@/lib/data/public";
import { seo } from "@/lib/seo";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/researchers/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    const d = await queryClient.ensureQueryData(researcherQuery(params.slug));
    if (!d) throw notFound();
    return { name: d.researcher.name, bio: d.researcher.bio };
  },
  head: ({ loaderData }) =>
    loaderData ? seo(loaderData.name, loaderData.bio.slice(0, 155) || `${loaderData.name} at BlackSeaShark5 Labs`) : { meta: [{ title: "Researcher unavailable" }, { name: "robots", content: "noindex" }] },
  component: ResearcherPage,
});

type Link_ = { label: string; url: string };

function ResearcherPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(researcherQuery(slug));
  if (!data) return null;
  const { researcher: r, publications } = data;
  const links = (Array.isArray(r.links) ? r.links : []) as Link_[];
  const projects = r.project_researchers.map((p) => p.projects).filter((p) => p && p.published);
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 animate-rise">
      <Link to="/researchers" className="font-mono text-xs text-muted-foreground hover:text-primary">← Researchers</Link>
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
        {r.photo_url ? (
          <img src={r.photo_url} alt={r.name} className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <span className="grid h-24 w-24 place-items-center rounded-full bg-accent font-mono text-2xl text-primary">{initials(r.name)}</span>
        )}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{r.name}</h1>
          <p className="mt-1 text-muted-foreground">{r.role_title}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{r.researcher_divisions.map((d) => d.divisions && <DivisionTag key={d.divisions.slug} d={d.divisions} />)}</div>
        </div>
      </div>
      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_260px]">
        <div>
          <p className="leading-relaxed text-foreground/90">{r.bio}</p>
          <h2 className="eyebrow mb-4 mt-12">Publications ({publications.length})</h2>
          {publications.length ? publications.map((p) => <PublicationRow key={p.id} p={p} />) : <Empty>No published papers yet.</Empty>}
        </div>
        <aside className="space-y-8 text-sm">
          {r.interests.length > 0 && <div><h2 className="eyebrow mb-2">Interests</h2><ul className="space-y-1">{r.interests.map((i) => <li key={i}>{i}</li>)}</ul></div>}
          {r.affiliations.length > 0 && <div><h2 className="eyebrow mb-2">Affiliations</h2><ul className="space-y-1">{r.affiliations.map((i) => <li key={i}>{i}</li>)}</ul></div>}
          {projects.length > 0 && <div><h2 className="eyebrow mb-2">Projects</h2><ul className="space-y-1">{projects.map((p) => p && <li key={p.slug}><Link to="/projects/$slug" params={{ slug: p.slug }} className="hover:text-primary">{p.title}</Link></li>)}</ul></div>}
          {links.length > 0 && <div><h2 className="eyebrow mb-2">Links</h2><ul className="space-y-1">{links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{l.label}</a></li>)}</ul></div>}
        </aside>
      </div>
    </div>
  );
}
