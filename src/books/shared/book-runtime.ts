export interface ChapterCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly volumeId: string;
  readonly order: number;
}

export interface VolumeCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly chapters: readonly ChapterCatalogEntry[];
}

export interface BookAttributionEntry {
  readonly name: string;
  readonly role: string;
}

export type BookAttribution = readonly BookAttributionEntry[];

export interface BookCatalog {
  readonly book: {
    readonly id: string;
    readonly order: number;
    readonly title: string;
    readonly attribution: BookAttribution;
    readonly description: string;
    readonly sealLines: readonly string[];
  };
  readonly volumes: readonly VolumeCatalogEntry[];
}

export interface ChapterLocation {
  readonly chapter: ChapterCatalogEntry;
  readonly volume: VolumeCatalogEntry;
  readonly previous: ChapterCatalogEntry | null;
  readonly next: ChapterCatalogEntry | null;
}

export interface ChapterReading extends ChapterLocation {
  readonly source: string;
}

export type BookRouteResolution =
  | { readonly kind: "book" }
  | ({ readonly kind: "volume" } & Pick<ChapterLocation, "volume">)
  | ({ readonly kind: "chapter" } & ChapterLocation)
  | { readonly kind: "redirect"; readonly to: string }
  | { readonly kind: "not-found" };

export interface BookRuntime {
  readonly catalog: BookCatalog;
  resolvePath(rawPath: string): BookRouteResolution;
  readChapter(chapterId: string): Promise<ChapterReading>;
}

type VolumeModule = { default: Record<string, string> };
type VolumeImport = () => Promise<VolumeModule>;

function pathnameOf(rawPath: string): string {
  return new URL(rawPath, "https://example.invalid").pathname;
}

export function createBookRuntime(
  sourceCatalog: BookCatalog,
  volumeImports: Readonly<Record<string, VolumeImport>>,
): BookRuntime {
  const volumes = [...sourceCatalog.volumes]
    .sort((left, right) => left.order - right.order)
    .map((volume) => ({
      ...volume,
      chapters: [...volume.chapters].sort((left, right) => left.order - right.order),
    }));
  const catalog: BookCatalog = { book: sourceCatalog.book, volumes };
  const chapters = volumes.flatMap((volume) => volume.chapters);
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const volumeById = new Map(volumes.map((volume) => [volume.id, volume]));
  const chapterPositionById = new Map(
    chapters.map((chapter, index) => [chapter.id, index]),
  );
  const failedVolumes = new Set<string>();
  const recoveredVolumes = new Map<string, Record<string, string>>();

  function locateChapter(chapterId: string): ChapterLocation | undefined {
    const chapter = chapterById.get(chapterId);
    const position = chapterPositionById.get(chapterId);
    if (!chapter || position === undefined) return undefined;
    const volume = volumeById.get(chapter.volumeId);
    if (!volume) throw new Error("篇章卷归属无效");
    return {
      chapter,
      volume,
      previous: chapters[position - 1] ?? null,
      next: chapters[position + 1] ?? null,
    };
  }

  async function recoverVolume(
    volumeId: string,
    load: VolumeImport,
  ): Promise<Record<string, string>> {
    if (typeof window !== "undefined") {
      const relativeUrl = load.toString().match(/import\(["'`]([^"'`]+)["'`]\)/)?.[1];
      if (relativeUrl) {
        const retryUrl = new URL(relativeUrl, import.meta.url);
        retryUrl.searchParams.set("retry", String(Date.now()));
        return (
          await import(/* @vite-ignore */ retryUrl.href) as VolumeModule
        ).default;
      }
    }
    return (await load()).default;
  }

  async function loadVolume(volumeId: string): Promise<Record<string, string>> {
    const recovered = recoveredVolumes.get(volumeId);
    if (recovered) return recovered;
    const load = volumeImports[volumeId];
    if (!load) throw new Error("未知卷");
    try {
      const content = failedVolumes.has(volumeId)
        ? await recoverVolume(volumeId, load)
        : (await load()).default;
      if (failedVolumes.delete(volumeId)) recoveredVolumes.set(volumeId, content);
      return content;
    } catch (error) {
      failedVolumes.add(volumeId);
      throw error;
    }
  }

  function resolvePath(rawPath: string): BookRouteResolution {
    const pathname = pathnameOf(rawPath);
    if (pathname.length > 1 && pathname.endsWith("/")) {
      const canonicalPath = pathname.slice(0, -1);
      const canonical = resolvePath(canonicalPath);
      return canonical.kind === "not-found"
        ? canonical
        : { kind: "redirect", to: canonicalPath };
    }

    const root = `/books/${catalog.book.id}`;
    if (pathname === root) return { kind: "book" };

    const volumeMatch = pathname.match(
      /^\/books\/([a-z0-9-]+)\/volumes\/([a-z0-9-]+)$/,
    );
    if (volumeMatch?.[1] === catalog.book.id) {
      const volume = volumeById.get(volumeMatch[2] ?? "");
      return volume ? { kind: "volume", volume } : { kind: "not-found" };
    }

    const chapterMatch = pathname.match(
      /^\/books\/([a-z0-9-]+)\/chapters\/([a-z0-9-]+)$/,
    );
    if (chapterMatch?.[1] === catalog.book.id) {
      const location = locateChapter(chapterMatch[2] ?? "");
      return location
        ? { kind: "chapter", ...location }
        : { kind: "not-found" };
    }
    return { kind: "not-found" };
  }

  return {
    catalog,
    resolvePath,
    async readChapter(chapterId) {
      const location = locateChapter(chapterId);
      if (!location) throw new Error("未知篇章");
      const content = await loadVolume(location.volume.id);
      return {
        ...location,
        source: content[chapterId] ?? "",
      };
    },
  };
}
