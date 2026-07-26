export type VolumeId = "v1" | "v2" | "v3" | "v4" | "v5";

const loadedVolumes = new Map<VolumeId, Record<string, string>>();

const volumeImports: Record<
  VolumeId,
  () => Promise<{ default: Record<string, string> }>
> = {
  v1: () => import("./volumes/v1"),
  v2: () => import("./volumes/v2"),
  v3: () => import("./volumes/v3"),
  v4: () => import("./volumes/v4"),
  v5: () => import("./volumes/v5"),
};

export async function loadVolume(volumeId: string): Promise<Record<string, string>> {
  if (!(volumeId in volumeImports)) throw new Error("未知卷");
  const id = volumeId as VolumeId;
  const cached = loadedVolumes.get(id);
  if (cached) return cached;
  const content = (await volumeImports[id]()).default;
  loadedVolumes.set(id, content);
  return content;
}

export function getVolumeChunkUrl(volumeId: string): string | undefined {
  if (!(volumeId in volumeImports)) return undefined;
  const importSource = volumeImports[volumeId as VolumeId].toString();
  const relativeUrl = importSource.match(/import\(["'`]([^"'`]+)["'`]\)/)?.[1];
  return relativeUrl ? new URL(relativeUrl, import.meta.url).href : undefined;
}

export function prefetchVolume(volumeId: string): void {
  void loadVolume(volumeId).catch(() => undefined);
}
