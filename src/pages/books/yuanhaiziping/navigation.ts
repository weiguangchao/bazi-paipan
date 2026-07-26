export interface ChapterCatalogEntry {
  id: string;
  title: string;
  volumeId: string;
  order: number;
  path: string;
  sourceStartLine: number;
  sourceEndLine: number;
}

export interface VolumeCatalogEntry {
  id: string;
  title: string;
  order: number;
  chapters: ChapterCatalogEntry[];
}

export interface BookCatalog {
  book: {
    id: string;
    title: string;
    author: string;
    description: string;
  };
  volumes: VolumeCatalogEntry[];
}

export interface BookIndex {
  catalog: BookCatalog;
  chapters: ChapterCatalogEntry[];
  chapterById: Map<string, ChapterCatalogEntry>;
  volumeById: Map<string, VolumeCatalogEntry>;
  chapterPositionById: Map<string, number>;
}

export type BookRouteResolution =
  | { kind: "book" }
  | { kind: "volume"; volume: VolumeCatalogEntry }
  | { kind: "chapter"; chapter: ChapterCatalogEntry }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" };

export function buildBookIndex(catalog: BookCatalog): BookIndex {
  const volumes = [...catalog.volumes].sort((left, right) => left.order - right.order);
  const chapters = volumes.flatMap((volume) =>
    [...volume.chapters].sort((left, right) => left.order - right.order),
  );

  return {
    catalog: { ...catalog, volumes },
    chapters,
    chapterById: new Map(chapters.map((chapter) => [chapter.id, chapter])),
    volumeById: new Map(volumes.map((volume) => [volume.id, volume])),
    chapterPositionById: new Map(chapters.map((chapter, index) => [chapter.id, index])),
  };
}

export function resolveBookPath(
  rawPath: string,
  index: BookIndex,
  legacyChapterIds: Readonly<Record<string, string>> = {},
): BookRouteResolution {
  const pathname = new URL(rawPath, "https://example.invalid").pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const canonicalPath = pathname.slice(0, -1);
    const canonicalResolution = resolveBookPath(canonicalPath, index, legacyChapterIds);
    return canonicalResolution.kind === "not-found"
      ? canonicalResolution
      : { kind: "redirect", to: canonicalPath };
  }

  const bookRoot = `/books/${index.catalog.book.id}`;
  if (pathname === bookRoot) return { kind: "book" };

  const volumeMatch = pathname.match(/^\/books\/([a-z0-9-]+)\/volumes\/([a-z0-9-]+)$/);
  if (volumeMatch?.[1] === index.catalog.book.id) {
    const volume = index.volumeById.get(volumeMatch[2] ?? "");
    return volume ? { kind: "volume", volume } : { kind: "not-found" };
  }

  const chapterMatch = pathname.match(/^\/books\/([a-z0-9-]+)\/chapters\/([a-z0-9-]+)$/);
  if (chapterMatch?.[1] === index.catalog.book.id) {
    const requestedId = chapterMatch[2] ?? "";
    const canonicalId = legacyChapterIds[requestedId];
    if (canonicalId && index.chapterById.has(canonicalId)) {
      return { kind: "redirect", to: `${bookRoot}/chapters/${canonicalId}` };
    }
    const chapter = index.chapterById.get(requestedId);
    return chapter ? { kind: "chapter", chapter } : { kind: "not-found" };
  }

  return { kind: "not-found" };
}

export function getChapterNeighbors(
  chapterId: string,
  index: BookIndex,
): { previous: ChapterCatalogEntry | null; next: ChapterCatalogEntry | null } {
  const position = index.chapterPositionById.get(chapterId);
  if (position === undefined) return { previous: null, next: null };
  return {
    previous: index.chapters[position - 1] ?? null,
    next: index.chapters[position + 1] ?? null,
  };
}
