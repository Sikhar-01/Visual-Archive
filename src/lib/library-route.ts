import type { Library } from "@/lib/model";

export function libraryNameSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "library";
}

export function libraryRouteSlug(library: Library, libraries: Library[]): string {
  const base = libraryNameSlug(library.name);
  const duplicates = libraries.filter((item) => libraryNameSlug(item.name) === base);
  if (duplicates.length < 2) return base;
  const suffix = library.id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-6);
  return `${base}-${suffix || "item"}`;
}
