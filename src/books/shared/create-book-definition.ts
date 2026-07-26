import type {
  BookDefinition,
  VolumeLoadMode,
} from "./book-definition";
import type { BookCatalog } from "./navigation";

type VolumeModule = { default: Record<string, string> };
type VolumeImport = () => Promise<VolumeModule>;

export function createBookDefinition(
  catalog: BookCatalog,
  chapterVolumeMap: Readonly<Record<string, string>>,
  volumeImports: Readonly<Record<string, VolumeImport>>,
  legacyChapterIds: Readonly<Record<string, string>> = {},
): BookDefinition {
  const loadedVolumes = new Map<string, Record<string, string>>();
  const failedVolumes = new Set<string>();

  return {
    catalog,
    legacyChapterIds,
    locateChapter(chapterId) {
      return chapterVolumeMap[chapterId];
    },
    async loadVolume(volumeId: string, mode: VolumeLoadMode) {
      const load = volumeImports[volumeId];
      if (!load) throw new Error("未知卷");
      if (mode === "normal") {
        const cached = loadedVolumes.get(volumeId);
        if (cached) return cached;
      } else {
        loadedVolumes.delete(volumeId);
        if (failedVolumes.has(volumeId) && typeof window !== "undefined") {
          const relativeUrl = load.toString().match(/import\(["'`]([^"'`]+)["'`]\)/)?.[1];
          if (relativeUrl) {
            const retryUrl = new URL(relativeUrl, import.meta.url);
            retryUrl.searchParams.set("retry", String(Date.now()));
            const content = (
              await import(/* @vite-ignore */ retryUrl.href) as VolumeModule
            ).default;
            failedVolumes.delete(volumeId);
            loadedVolumes.set(volumeId, content);
            return content;
          }
        }
      }
      try {
        const content = (await load()).default;
        failedVolumes.delete(volumeId);
        loadedVolumes.set(volumeId, content);
        return content;
      } catch (error) {
        failedVolumes.add(volumeId);
        throw error;
      }
    },
  };
}
