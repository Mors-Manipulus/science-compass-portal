import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DivisionTag } from "@/components/site/Publication";
import { projectQuery } from "@/lib/data/public";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/projects/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    const p = await queryClient.ensureQueryData(projectQuery(params.slug));
    if (!p) throw notFound();
    return { title: p.title, summary: p.summary };
  },
  head: ({ loaderData }) =>
    loaderData ? seo(loaderData.title, loaderData.summary) : { meta: [{ title: "Project unavailable" }, { name: "robots", content: "noindex" }] },
  component: ProjectPage,
});

function ProjectPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(projectQuery(slug));
  if (!p) return null;
  const links = (Array.isArray(p.links) ? p.links : []) as { label: string; url: string }[];
  return (
    <article className="mx-auto max-w-4xl px-5 py-14 animate-rise">
      <Link to="/projects" className="font-mono text-xs text-muted-foreground hover:text-primary">← Projects</Link>
      <div className="mt-6 flex flex-wrap gap-1.5">{p.project_divisions.map((d) => d.divisions && <DivisionTag key={d.divisions.slug} d={d.divisions} />)}</div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">{p.title}</h1>
      <p className="mt-2 font-mono text-xs"><span className="text-coral">{p.status}</span>{p.start_year ? ` · since ${p.start_year}` : ""}</p>
      {p.image_url && <img src={p.image_url} alt="" className="mt-8 w-full rounded-md border border-border" />}
      <p className="mt-8 text-lg text-muted-foreground">{p.summary}</p>
      <p className="mt-6 whitespace-pre-line leading-relaxed">{p.description}</p>
      {p.project_researchers.length > 0 && (
        <>
          <h2 className="eyebrow mb-3 mt-12">Team</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {p.project_researchers.map((r) => r.researchers && (
              <li key={r.researchers.slug}><Link to="/researchers/$slug" params={{ slug: r.researchers.slug }} className="hover:text-primary">{r.researchers.name}</Link> <span className="text-xs text-muted-foreground">· {r.researchers.role_title}</span></li>
            ))}
          </ul>
        </>
      )}
      {links.length > 0 && (
        <>
          <h2 className="eyebrow mb-3 mt-10">Links</h2>
          <ul className="space-y-1">{links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{l.label}</a></li>)}</ul>
        </>
      )}
    </article>
  );
}
