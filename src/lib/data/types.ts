export type DivisionRef = { slug: string; name: string; short_name: string };

export type PublicationAuthor = {
  position: number;
  author_name: string;
  researcher_id: string | null;
  researchers: { slug: string; name: string } | null;
};

export type PublicationListItem = {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  pub_date: string | null;
  year: number | null;
  venue: string | null;
  doi: string | null;
  pdf_path: string | null;
  pdf_name: string | null;
  featured: boolean;
  status: string;
  visibility: string;
  publication_authors: PublicationAuthor[];
  publication_divisions: { divisions: DivisionRef | null }[];
};

export const PUBLICATION_SELECT =
  "id,slug,title,abstract,pub_date,year,venue,doi,pdf_path,pdf_name,featured,status,visibility,publication_authors(position,author_name,researcher_id,researchers(slug,name)),publication_divisions(divisions(slug,name,short_name))";

export function sortedAuthors(p: PublicationListItem) {
  return [...p.publication_authors].sort((a, b) => a.position - b.position);
}
export function pubDivisions(p: PublicationListItem) {
  return p.publication_divisions.map((d) => d.divisions).filter(Boolean) as DivisionRef[];
}
