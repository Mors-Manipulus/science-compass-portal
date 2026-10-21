import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { divisionsQuery, featuredPublicationsQuery, newsQuery, projectsQuery, researchersQuery } from "@/lib/data/public";
import { PublicationCard } from "@/components/site/Publication";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seo(
      "BlackSeaShark5 Labs — Independent Research Laboratory",
      "Pushing the frontiers of intelligence, science and human potential across six open research divisions.",
    ),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(divisionsQuery()),
      queryClient.ensureQueryData(featuredPublicationsQuery()),
      queryClient.ensureQueryData(projectsQuery()),
      queryClient.ensureQueryData(newsQuery(3)),
      queryClient.ensureQueryData(researchersQuery()),
    ]),
  component: Home,
});

function SectionHead({ eyebrow, title, to, cta }: { eyebrow: string; title: string; to: string; cta: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
      </div>
      <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Home() {
  const { data: divisions } = useSuspenseQuery(divisionsQuery());
  const { data: featured } = useSuspenseQuery(featuredPublicationsQuery());
  const { data: projects } = useSuspenseQuery(projectsQuery());
  const { data: news } = useSuspenseQuery(newsQuery(3));
  const { data: researchers } = useSuspenseQuery(researchersQuery());
  const leads = researchers.filter((r) => r.role_title.startsWith("Division Lead"));

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-hero">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_70%_at_30%_30%,black,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 md:py-32 animate-rise">
          <p className="eyebrow">Independent research laboratory · Est. 2026</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Pushing the frontiers of intelligence, science <span className="text-primary">&amp;</span> human potential
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            We advance the foundations of machine intelligence, quantum science, medicine, neurotechnology, geopolitics and
            computer vision — published openly, reproducible, and for the public good.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/divisions" className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Explore research
            </Link>
            <Link to="/publications" className="rounded-md border border-border px-5 py-3 text-sm font-medium hover:bg-accent">
              Browse publications
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <SectionHead eyebrow="Six divisions" title="One scientific agenda, six frontiers" to="/divisions" cta="All divisions" />
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {divisions.map((d, i) => (
            <Link
              key={d.id}
              to="/divisions/$slug"
              params={{ slug: d.slug }}
              className="group bg-background p-7 transition-colors hover:bg-surface"
            >
              <p className="font-mono text-xs text-muted-foreground">0{i + 1}</p>
              <h3 className="mt-3 text-xl font-semibold group-hover:text-primary">{d.name}</h3>
              <p className="mt-1 text-sm text-coral">{d.tagline}</p>
              <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{d.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <SectionHead eyebrow="Featured research" title="Selected papers" to="/publications" cta="Publication library" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => <PublicationCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-8 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="People" title="Division leads" to="/researchers" cta={`All ${researchers.length} researchers`} />
          <ul className="grid grid-cols-2 gap-3">
            {leads.map((r) => (
              <li key={r.id}>
                <Link to="/researchers/$slug" params={{ slug: r.slug }} className="block rounded-md border border-border p-4 hover:border-primary/40">
                  <p className="font-medium">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.role_title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
