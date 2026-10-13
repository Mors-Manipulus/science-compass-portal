export function initials(name: string) {
  return name.replace(/^Dr\.?\s+/i, "").split(/\s+/).map((s) => s[0]).slice(0, 2).join("");
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
