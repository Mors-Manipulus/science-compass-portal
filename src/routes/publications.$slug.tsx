import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AuthorList, DivisionTag, PdfActions } from "@/components/site/Publication";
import { publicationQuery } from "@/lib/data/public";
import { pubDivisions } from "@/lib/data/types";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/publications/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    const p = await queryClient.ensureQueryData(publicationQuery(params.slug));
    if (!p) throw notFound();
    return { title: p.title, abstract: p.abstract };
  },
  head: ({ loaderData }) =>
    loaderData
      ? seo(loaderData.title, loaderData.abstract.slice(0, 155))
      : { meta: [{ title: "Publication unavailable" }, { name: "robots", content: "noindex" }] },
  component: PublicationPage,
});

function PublicationPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(publicationQuery(slug));
  if (!p) return null;
  const isPreview = p.status !== "published" || p.visibility !== "public";
  return (
    <article className="mx-auto max-w-4xl px-5 py-14 animate-rise">
      {isPreview && (
        <div role="status" className="mb-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Staff preview — this paper is <strong>{p.status}</strong> / {p.visibility} and is not visible to the public.
        </div>
      )}
      <Link to="/publications" className="font-mono text-xs text-muted-foreground hover:text-primary">← Publications</Link>
      <div className="mt-6 flex flex-wrap gap-1.5">{pubDivisions(p).map((d) => <DivisionTag key={d.slug} d={d} />)}</div>
      <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{p.title}</h1>
      <div className="mt-4"><AuthorList p={p} /></div>
      <dl className="mt-8 grid gap-4 border-y border-border py-5 font-mono text-xs sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Published</dt><dd className="mt-1">{p.pub_date ? new Date(p.pub_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Venue</dt><dd className="mt-1">{p.venue ?? "—"}</dd></div>
        <div>
          <dt className="text-muted-foreground">DOI</dt>
          <dd className="mt-1 break-all">{p.doi ? <a className="text-primary hover:underline" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.doi}</a> : "—"}</dd>
        </div>
      </dl>
      <div className="mt-8"><PdfActions p={p} size="lg" /></div>
      <h2 className="eyebrow mt-12">Abstract</h2>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground/90">{p.abstract || "No abstract available."}</p>
    </article>
  );
}
