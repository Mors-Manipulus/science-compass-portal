// Pure, testable helpers for the publication import workflow.

export type RawRow = Record<string, unknown>;
export type TargetField =
  | "source_id" | "title" | "authors" | "abstract" | "pub_date" | "venue" | "doi" | "divisions" | "pdf_file";

export const TARGET_FIELDS: { key: TargetField; label: string; aliases: string[] }[] = [
  { key: "source_id", label: "Source ID", aliases: ["id", "source_id", "sourceid", "uuid", "paper_id"] },
  { key: "title", label: "Title", aliases: ["title", "paper_title", "name"] },
  { key: "authors", label: "Authors", aliases: ["authors", "author", "author_list"] },
  { key: "abstract", label: "Abstract", aliases: ["abstract", "description", "summary"] },
  { key: "pub_date", label: "Date / year", aliases: ["date", "pub_date", "published", "publication_date", "year"] },
  { key: "venue", label: "Journal / conference", aliases: ["venue", "journal", "conference"] },
  { key: "doi", label: "DOI", aliases: ["doi"] },
  { key: "divisions", label: "Division(s)", aliases: ["division", "divisions", "category"] },
  { key: "pdf_file", label: "PDF file name", aliases: ["pdf", "pdf_file", "file", "filename", "pdf_url"] },
];

export type Mapping = Partial<Record<TargetField, string>>;

export function parseCSV(text: string): RawRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  if (rows.length === 0) return [];
  const headers = rows[0]!.map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export function parseInput(text: string, format: "csv" | "json"): RawRow[] {
  if (format === "csv") return parseCSV(text);
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : Array.isArray(data?.publications) ? data.publications : null;
  if (!arr) throw new Error("JSON must be an array of records (or an object with a `publications` array).");
  return arr.filter((r: unknown) => r && typeof r === "object") as RawRow[];
}

export function autoMap(headers: string[]): Mapping {
  const m: Mapping = {};
  const norm = (s: string) => s.toLowerCase().replace(/[\s-]+/g, "_");
  for (const f of TARGET_FIELDS) {
    const h = headers.find((h) => f.aliases.includes(norm(h)));
    if (h) m[f.key] = h;
  }
  return m;
}

export function normalizeTitle(t: string) {
  return t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

export function normalizeDoi(d: string) {
  return d.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").toLowerCase();
}

function str(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(str).join("; ");
  if (typeof v === "object") return (v as { name?: string }).name ?? "";
  return String(v).trim();
}

export function splitAuthors(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  if (!s) return [];
  return s.split(s.includes(";") ? ";" : /,|\band\b/).map((a) => a.trim()).filter(Boolean);
}

export function parseDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 1900 || y > 2100) return null;
  return d.toISOString().slice(0, 10);
}

export type DivisionLite = { id: string; slug: string; name: string; short_name: string };
export type ExistingPub = { id: string; title: string; year: number | null; doi: string | null; source_id: string | null };

export type PreviewRow = {
  row: number;
  source_id: string | null;
  title: string;
  authors: string[];
  abstract: string;
  pub_date: string | null;
  venue: string | null;
  doi: string | null;
  pdf_file: string | null;
  divisionIds: string[];
  sourceDivision: string;
  errors: string[];
  warnings: string[];
  duplicateOf: string | null; // existing publication id, or "file:<row>"
  include: boolean;
};

/** Only exact, explicit division values from the source are mapped. Anything else stays Unassigned. */
export function matchDivisions(v: unknown, divisions: DivisionLite[]): { ids: string[]; unmatched: string[] } {
  const parts = (Array.isArray(v) ? v.map(str) : str(v).split(/[;,|]/)).map((p) => p.trim()).filter(Boolean);
  const ids: string[] = [];
  const unmatched: string[] = [];
  for (const p of parts) {
    const l = p.toLowerCase();
    const d = divisions.find((d) => [d.slug, d.name, d.short_name].some((x) => x.toLowerCase() === l));
    if (d) { if (!ids.includes(d.id)) ids.push(d.id); } else unmatched.push(p);
  }
  return { ids, unmatched };
}

export function buildPreview(rows: RawRow[], mapping: Mapping, existing: ExistingPub[], divisions: DivisionLite[]): PreviewRow[] {
  const byDoi = new Map(existing.filter((e) => e.doi).map((e) => [normalizeDoi(e.doi!), e.id]));
  const bySource = new Map(existing.filter((e) => e.source_id).map((e) => [e.source_id!, e.id]));
  const byTitle = new Map(existing.map((e) => [`${normalizeTitle(e.title)}|${e.year ?? ""}`, e.id]));
  const seen = new Map<string, number>();

  return rows.map((raw, i) => {
    const get = (k: TargetField) => (mapping[k] ? raw[mapping[k]!] : undefined);
    const title = str(get("title"));
    const doiRaw = str(get("doi"));
    const doi = doiRaw ? normalizeDoi(doiRaw) : null;
    const pub_date = parseDate(get("pub_date"));
    const source_id = str(get("source_id")) || null;
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!title) errors.push("Missing title");
    if (str(get("pub_date")) && !pub_date) warnings.push("Unreadable date");
    if (!pub_date) warnings.push("No publication date");
    if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi)) warnings.push("DOI looks invalid");
    const authors = splitAuthors(get("authors"));
    if (!authors.length) warnings.push("No authors");
    if (!str(get("abstract"))) warnings.push("No abstract");
    const { ids, unmatched } = matchDivisions(get("divisions"), divisions);
    if (unmatched.length) warnings.push(`Unrecognised division: ${unmatched.join(", ")}`);
    if (!ids.length) warnings.push("Unassigned — needs division review");

    const year = pub_date ? pub_date.slice(0, 4) : "";
    let duplicateOf: string | null = null;
    if (doi && byDoi.has(doi)) duplicateOf = byDoi.get(doi)!;
    else if (source_id && bySource.has(source_id)) duplicateOf = bySource.get(source_id)!;
    else if (title && byTitle.has(`${normalizeTitle(title)}|${year}`)) duplicateOf = byTitle.get(`${normalizeTitle(title)}|${year}`)!;
    const fileKey = doi ? `doi:${doi}` : `t:${normalizeTitle(title)}|${year}`;
    if (!duplicateOf && title) {
      if (seen.has(fileKey)) duplicateOf = `file:${seen.get(fileKey)}`;
      else seen.set(fileKey, i + 1);
    }

    return {
      row: i + 1,
      source_id,
      title,
      authors,
      abstract: str(get("abstract")),
      pub_date,
      venue: str(get("venue")) || null,
      doi,
      pdf_file: str(get("pdf_file")).split("/").pop() || null,
      divisionIds: ids,
      sourceDivision: str(get("divisions")),
      errors,
      warnings,
      duplicateOf,
      include: errors.length === 0 && !duplicateOf,
    };
  });
}
