// Public data access. UI components never talk to the database directly —
// they use these query options. Row Level Security decides what is visible.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PUBLICATION_SELECT, type PublicationListItem } from "./types";

export const PAGE_SIZE = 10;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const divisionsQuery = () =>
  queryOptions({
    queryKey: ["divisions"],
    queryFn: async () =>
      check(await supabase.from("divisions").select("*").order("sort_order")),
  });

export const divisionQuery = (slug: string) =>
  queryOptions({
    queryKey: ["division", slug],
    queryFn: async () => {
      const division = check(
        await supabase.from("divisions").select("*").eq("slug", slug).maybeSingle(),
      );
      if (!division) return null;
      const [pubIds, researchers, projects, news] = await Promise.all([
        supabase.from("publication_divisions").select("publication_id").eq("division_id", division.id),
        supabase
          .from("researcher_divisions")
          .select("researchers(id,slug,name,role_title,interests,active)")
          .eq("division_id", division.id),
        supabase
          .from("project_divisions")
          .select("projects(id,slug,title,summary,status,published)")
          .eq("division_id", division.id),
        supabase
          .from("news")
          .select("id,slug,title,summary,published_at")
          .eq("division_id", division.id)
          .order("published_at", { ascending: false }),
      ]);
      const ids = (check(pubIds) ?? []).map((r) => r.publication_id);
      const publications = ids.length
        ? (check(
            await supabase
              .from("publications")
              .select(PUBLICATION_SELECT)
              .in("id", ids)
              .eq("status", "published")
              .eq("visibility", "public")
              .order("pub_date", { ascending: false }),
          ) as unknown as PublicationListItem[])
        : [];
      return {
        division,
        publications,
        researchers: (check(researchers) ?? []).map((r) => r.researchers).filter((r) => r && r.active),
        projects: (check(projects) ?? []).map((r) => r.projects).filter((p) => p && p.published),
        news: check(news) ?? [],
      };
    },
  });

export type PubSearch = { q?: string; division?: string; year?: number; page?: number };

export function sanitizeSearch(q: string) {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

export const publicationsQuery = (s: PubSearch) =>
  queryOptions({
    queryKey: ["publications", s],
    queryFn: async () => {
      const page = Math.max(1, s.page ?? 1);
      let query = supabase
        .from("publications")
        .select(PUBLICATION_SELECT, { count: "exact" })
        .eq("status", "published")
        .eq("visibility", "public");
      if (s.division) {
        const d = check(
          await supabase.from("divisions").select("id").eq("slug", s.division).maybeSingle(),
        );
        const ids = d
          ? (check(
              await supabase.from("publication_divisions").select("publication_id").eq("division_id", d.id),
            ) ?? []).map((r) => r.publication_id)
          : [];
        query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      }
      if (s.year) query = query.eq("year", s.year);
      const q = sanitizeSearch(s.q ?? "");
      if (q) query = query.or(`title.ilike.%${q}%,abstract.ilike.%${q}%,venue.ilike.%${q}%`);
      const from = (page - 1) * PAGE_SIZE;
      const res = await query
        .order("pub_date", { ascending: false, nullsFirst: false })
        .range(from, from + PAGE_SIZE - 1);
      if (res.error) throw new Error(res.error.message);
      return { items: res.data as unknown as PublicationListItem[], total: res.count ?? 0, page };
    },
  });

export const publicationYearsQuery = () =>
  queryOptions({
    queryKey: ["publication-years"],
    queryFn: async () => {
      const rows = check(await supabase.from("publications").select("year").eq("status", "published").eq("visibility", "public"));
      return [...new Set((rows ?? []).map((r) => r.year).filter((y): y is number => !!y))].sort((a, b) => b - a);
    },
  });

export const featuredPublicationsQuery = () =>
  queryOptions({
    queryKey: ["publications", "featured"],
    queryFn: async () =>
      check(
        await supabase
          .from("publications")
          .select(PUBLICATION_SELECT)
          .eq("status", "published")
          .eq("visibility", "public")
          .eq("featured", true)
          .order("pub_date", { ascending: false })
          .limit(4),
      ) as unknown as PublicationListItem[],
  });

export const publicationQuery = (slug: string) =>
  queryOptions({
    queryKey: ["publication", slug],
    queryFn: async () =>
      check(
        await supabase.from("publications").select(PUBLICATION_SELECT).eq("slug", slug).maybeSingle(),
      ) as unknown as PublicationListItem | null,
  });

export const researchersQuery = () =>
  queryOptions({
    queryKey: ["researchers"],
    queryFn: async () =>
      check(
        await supabase
          .from("researchers")
          .select("id,slug,name,role_title,photo_url,interests,researcher_divisions(divisions(slug,short_name,name))")
          .eq("active", true)
          .order("name"),
      ),
  });

export const researcherQuery = (slug: string) =>
  queryOptions({
    queryKey: ["researcher", slug],
    queryFn: async () => {
      const r = check(
        await supabase
          .from("researchers")
          .select("*,researcher_divisions(divisions(slug,short_name,name)),project_researchers(projects(slug,title,summary,status,published))")
          .eq("slug", slug)
          .maybeSingle(),
      );
      if (!r) return null;
      const authored = check(
        await supabase.from("publication_authors").select("publication_id").eq("researcher_id", r.id),
      );
      const ids = (authored ?? []).map((a) => a.publication_id);
      const publications = ids.length
        ? (check(
            await supabase
              .from("publications")
              .select(PUBLICATION_SELECT)
              .in("id", ids)
              .eq("status", "published")
              .eq("visibility", "public")
              .order("pub_date", { ascending: false }),
          ) as unknown as PublicationListItem[])
        : [];
      return { researcher: r, publications };
    },
  });

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async () =>
      check(
        await supabase
          .from("projects")
          .select("id,slug,title,summary,status,start_year,featured,image_url,project_divisions(divisions(slug,short_name,name))")
          .eq("published", true)
          .order("featured", { ascending: false })
          .order("start_year", { ascending: false }),
      ),
  });

export const projectQuery = (slug: string) =>
  queryOptions({
    queryKey: ["project", slug],
    queryFn: async () =>
      check(
        await supabase
          .from("projects")
          .select("*,project_divisions(divisions(slug,short_name,name)),project_researchers(researchers(slug,name,role_title))")
          .eq("slug", slug)
          .maybeSingle(),
      ),
  });

export const newsQuery = (limit?: number) =>
  queryOptions({
    queryKey: ["news", limit ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("news")
        .select("id,slug,title,summary,published_at,image_url,divisions(slug,short_name)")
        .eq("published", true)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });
      if (limit) q = q.limit(limit);
      return check(await q);
    },
  });

export const newsArticleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["news-article", slug],
    queryFn: async () =>
      check(
        await supabase.from("news").select("*,divisions(slug,short_name,name)").eq("slug", slug).maybeSingle(),
      ),
  });

/** Creates a short-lived signed link. Storage policies only allow it for published public papers (or staff). */
export async function getPdfUrl(path: string, downloadName?: string) {
  const { data, error } = await supabase.storage
    .from("publication-pdfs")
    .createSignedUrl(path, 120, downloadName ? { download: downloadName } : undefined);
  if (error || !data) throw new Error("This PDF is not available.");
  return data.signedUrl;
}
