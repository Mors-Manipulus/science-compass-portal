import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [pubs, pd, res, proj, news] = await Promise.all([
        supabase.from("publications").select("id,status,pdf_path,external_url,abstract,pub_date"),
        supabase.from("publication_divisions").select("publication_id"),
        supabase.from("researchers").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("news").select("id", { count: "exact", head: true }),
      ]);
      const p = pubs.data ?? [];
      const assigned = new Set((pd.data ?? []).map((r) => r.publication_id));
      return {
        total: p.length,
        byStatus: (["published", "in_review", "draft", "archived"] as const).map((s) => [s, p.filter((x) => x.status === s).length] as const),
        unassigned: p.filter((x) => !assigned.has(x.id)).length,
        noPdf: p.filter((x) => !x.pdf_path && !x.external_url && x.status !== "archived").length,
        incomplete: p.filter((x) => !x.abstract || !x.pub_date).length,
        researchers: res.count ?? 0,
        projects: proj.count ?? 0,
        news: news.count ?? 0,
      };
    },
  });
  const card = "rounded-md border border-border bg-surface p-5";
  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data?.byStatus.map(([s, n]) => (
          <Link key={s} to="/admin/publications" search={{ status: s }} className={`${card} hover:border-primary/40`}>
            <p className="eyebrow">{s.replace("_", " ")}</p>
            <p className="mt-2 text-3xl font-semibold">{n}</p>
          </Link>
        ))}
      </div>
      <h2 className="mt-10 font-semibold">Needs attention</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Link to="/admin/publications" search={{ division: "unassigned" }} className={`${card} hover:border-warning/50`}>
          <p className="text-3xl font-semibold text-warning">{data?.unassigned ?? "–"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Unassigned papers</p>
        </Link>
        <div className={card}><p className="text-3xl font-semibold">{data?.noPdf ?? "–"}</p><p className="mt-1 text-sm text-muted-foreground">Papers without a PDF</p></div>
        <div className={card}><p className="text-3xl font-semibold">{data?.incomplete ?? "–"}</p><p className="mt-1 text-sm text-muted-foreground">Missing abstract or date</p></div>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Link to="/admin/researchers" className={card}><p className="text-3xl font-semibold">{data?.researchers ?? "–"}</p><p className="mt-1 text-sm text-muted-foreground">Active researchers</p></Link>
        <Link to="/admin/projects" className={card}><p className="text-3xl font-semibold">{data?.projects ?? "–"}</p><p className="mt-1 text-sm text-muted-foreground">Projects</p></Link>
        <Link to="/admin/news" className={card}><p className="text-3xl font-semibold">{data?.news ?? "–"}</p><p className="mt-1 text-sm text-muted-foreground">News articles</p></Link>
      </div>
    </div>
  );
}
