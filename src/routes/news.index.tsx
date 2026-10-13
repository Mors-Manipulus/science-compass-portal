import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/site/SiteChrome";
import { newsQuery } from "@/lib/data/public";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/news/")({
  head: () => seo("News", "News and announcements from BlackSeaShark5 Labs."),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(newsQuery()),
  component: News,
});

function News() {
  const { data } = useSuspenseQuery(newsQuery());
  return (
    <>
      <PageHeader eyebrow="Newsroom" title="News & announcements" />
      <ul className="mx-auto max-w-4xl divide-y divide-border px-5 py-8">
        {data.map((n) => (
          <li key={n.id}>
            <Link to="/news/$slug" params={{ slug: n.slug }} className="group grid gap-2 py-8 sm:grid-cols-[140px_1fr]">
              <p className="font-mono text-xs text-muted-foreground">
                {new Date(n.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {n.divisions && <span className="block text-primary">{n.divisions.short_name}</span>}
              </p>
              <div>
                <h2 className="text-xl font-semibold group-hover:text-primary">{n.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{n.summary}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
