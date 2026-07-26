import { useEffect, useState, type ComponentType } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import volumeByChapter from "./chapter-volume-map.json";
import { getVolumeChunkUrl, loadVolume } from "./load-volume";
import { buildBookIndex, type BookCatalog, type ChapterCatalogEntry } from "./navigation";
import type { ChapterReaderProps } from "./ChapterReader";

type Reader = ComponentType<ChapterReaderProps>;
type State = {
  Reader?: Reader;
  catalog?: BookCatalog;
  chapter?: ChapterCatalogEntry;
  source?: string;
  error?: string;
  loading: boolean;
};

export default function ChapterEntry() {
  const { chapterId = "" } = useParams();
  const location = useLocation();
  const [state, setState] = useState<State>({ loading: true });
  const volumeId = (volumeByChapter as Record<string, string>)[chapterId];

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, error: undefined, loading: true }));
    if (!volumeId) {
      void Promise.all([import("./catalog.json"), import("./ChapterReader")]).then(([catalogModule, readerModule]) => {
        if (!active) return;
        setState({ Reader: readerModule.default, catalog: catalogModule.default as BookCatalog, loading: false, error: "请求的篇章不存在" });
      });
      return () => { active = false; };
    }
    const catalogPromise = import("./catalog.json");
    const readerPromise = import("./ChapterReader");
    const volumePromise = loadVolume(volumeId);
    void Promise.all([catalogPromise, readerPromise])
      .then(([catalogModule, readerModule]) => {
        if (!active) return;
        const catalog = catalogModule.default as BookCatalog;
        const chapter = buildBookIndex(catalog).chapterById.get(chapterId);
        if (!chapter) throw new Error("请求的篇章不存在");
        setState({ Reader: readerModule.default, catalog, chapter, loading: true });
        return volumePromise
          .then((volume) => {
            if (active) setState({ Reader: readerModule.default, catalog, chapter, source: volume[chapterId], loading: false });
          })
          .catch(() => {
            if (active) setState({ Reader: readerModule.default, catalog, chapter, loading: false, error: "本卷正文载入失败，请稍后重试。" });
          });
      })
      .catch(() => {
        if (active) setState((current) => ({ ...current, loading: false, error: "本卷正文载入失败，请稍后重试。" }));
      });
    return () => { active = false; };
  }, [chapterId, volumeId]);

  if (location.pathname.endsWith("/") && state.chapter) {
    return <Navigate replace to={`${location.pathname.slice(0, -1)}${location.search}`} />;
  }
  if (!state.Reader || !state.catalog) return <main className="book-loading" aria-live="polite">正在打开篇章 {chapterId}…</main>;
  if (!state.chapter) {
    return <main className="book-not-found"><p>典籍 · 未找到</p><h1>此篇章不存在</h1><a href="/books/yuanhaiziping">返回《渊海子平》首页</a></main>;
  }
  async function retryCurrentVolume() {
    const failedChunk = getVolumeChunkUrl(volumeId ?? "");
    if (failedChunk) {
      try {
        await fetch(failedChunk, { cache: "reload" });
      } catch {
        // The reload below creates a fresh module graph and reports failure safely again.
      }
    }
    window.location.reload();
  }
  return <state.Reader catalog={state.catalog} chapter={state.chapter} source={state.source} error={state.error} loading={state.loading} onRetry={() => void retryCurrentVolume()} />;
}
