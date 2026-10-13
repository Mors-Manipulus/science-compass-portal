import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/site/SiteChrome";
import { projectsQuery } from "@/lib/data/public";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/projects/")({
  head: () => seo("Projects", "Research programmes and open projects at BlackSeaShark5 Labs."),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(projectsQuery()),
  component: Projects,
});

function Projects() {
  const { data } = useSuspenseQuery(projectsQuery());
  return (
    <>
      <PageHeader eyebrow="Projects" title="Research programmes" />
      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 md:grid-cols-2 lg:grid-cols-3">
        {data.map((p) => (
          <Link key={p.id} to="/projects/$slug" params={{ slug: p.slug }} className="flex flex-col overflow-hidden rounded-md border border-border transition-colors hover:border-primary/40">
            {p.image_url ? <img src={p.image_url} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="grid-lines bg-hero aspect-[16/9] w-full" />}
            <div className="flex flex-1 flex-col p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {p.project_divisions.map((d) => d.divisions?.short_name).join(" · ")}
              </p>
              <h2 className="mt-2 text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>
              <p className="mt-auto pt-4 font-mono text-xs"><span className="text-coral">{p.status}</span>{p.start_year ? ` · since ${p.start_year}` : ""}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
