import type { BookRegistry } from "./book-registry";

export type BooksRouteResolution =
  | { kind: "index" }
  | { kind: "book"; bookId: string }
  | { kind: "book-resource"; bookId: string }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" };

function pathnameOf(rawPath: string): string {
  return new URL(rawPath, "https://example.invalid").pathname;
}

export function resolveBooksPath(
  rawPath: string,
  registry: BookRegistry,
): BooksRouteResolution {
  const pathname = pathnameOf(rawPath);
  if (pathname === "/books") return { kind: "index" };
  if (pathname === "/books/") return { kind: "redirect", to: "/books" };

  const match = pathname.match(/^\/books\/([a-z0-9-]+)(\/.*)?$/);
  if (!match) return { kind: "not-found" };
  const bookId = match[1] ?? "";
  if (!registry.find(bookId)) return { kind: "not-found" };
  if (!match[2]) return { kind: "book", bookId };
  return { kind: "book-resource", bookId };
}
