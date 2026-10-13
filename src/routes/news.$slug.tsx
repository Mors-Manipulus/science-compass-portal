import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { newsArticleQuery } from "@/lib/data/public";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    const n = await queryClient.ensureQueryData(newsArticleQuery(params.slug));
    if (!n) throw notFound();
    return { title: n.title, summary: n.summary };
  },
  head: ({ loaderData }) =>
    loaderData ? seo(loaderData.title, loaderData.summary) : { meta: [{ title: "Article unavailable" }, { name: "robots", content: "noindex" }] },
  component: Article,
});

function Article() {
  const { slug } = Route.useParams();
  const { data: n } = useSuspenseQuery(newsArticleQuery(slug));
  if (!n) return null;
  return (
    <article className="mx-auto max-w-3xl px-5 py-14 animate-rise">
      <Link to="/news" className="font-mono text-xs text-muted-foreground hover:text-primary">← News</Link>
      <p className="mt-8 font-mono text-xs text-muted-foreground">
        {new Date(n.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        {n.divisions && <> · <Link to="/divisions/$slug" params={{ slug: n.divisions.slug }} className="text-primary">{n.divisions.name}</Link></>}
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{n.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{n.summary}</p>
      {n.image_url && <img src={n.image_url} alt="" className="mt-8 w-full rounded-md border border-border" />}
      <div className="mt-8 whitespace-pre-line leading-relaxed">{n.body}</div>
    </article>
  );
}
