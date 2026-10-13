import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/site/SiteChrome";
import { divisionsQuery } from "@/lib/data/public";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/divisions/")({
  head: () => seo("Research Divisions", "The six research divisions of BlackSeaShark5 Labs: AI, Quantum, Medical, Neuro / BCI, Robotics and Chip."),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(divisionsQuery()),
  component: Divisions,
});

function Divisions() {
  const { data } = useSuspenseQuery(divisionsQuery());
  return (
    <>
      <PageHeader eyebrow="Research" title="Six divisions, one scientific agenda" />
      <div className="mx-auto max-w-7xl divide-y divide-border px-5 py-6">
        {data.map((d, i) => (
          <Link key={d.id} to="/divisions/$slug" params={{ slug: d.slug }} className="group grid gap-4 py-10 md:grid-cols-[80px_1fr_1fr]">
            <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
            <div>
              <h2 className="text-2xl font-semibold group-hover:text-primary">{d.name}</h2>
              <p className="mt-1 text-coral">{d.tagline}</p>
              {d.lead_name && <p className="mt-3 font-mono text-xs text-muted-foreground">Lead · {d.lead_name}</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{d.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {d.focus_areas.map((f) => <span key={f} className="rounded-sm border border-border px-2 py-0.5 text-xs">{f}</span>)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
