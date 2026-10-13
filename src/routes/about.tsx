import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/SiteChrome";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => seo("About", "BlackSeaShark5 Labs is an independent research laboratory committed to open, reproducible science."),
  component: About,
});

const PRINCIPLES = [
  { t: "Open science", d: "Everything we publish — papers, models, datasets, chips and code — is released openly. No paywalls, no gated APIs, no proprietary lock-in." },
  { t: "Reproducible results", d: "Science moves forward when everyone can build on it. We publish the methods, data and tooling needed to reproduce our work." },
  { t: "Responsible release", d: "We evaluate systems rigorously before release and work with partners to translate research into measurable public benefit." },
];

function About() {
  return (
    <>
      <PageHeader eyebrow="About the lab" title="An independent laboratory for open, reproducible research">
        We advance the foundations of machine intelligence, quantum science, medicine, neurotechnology, robotics and open
        silicon — all published openly, all reproducible, all for the public good.
      </PageHeader>
      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.t} className="bg-background p-8">
              <h2 className="text-xl font-semibold">{p.t}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link to="/divisions" className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">Our divisions</Link>
          <Link to="/contact" className="rounded-md border border-border px-5 py-3 text-sm">Contact</Link>
        </div>
      </div>
    </>
  );
}
