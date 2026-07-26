import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { RestrictedMarkdown } from "./RestrictedMarkdown";
import { buildBookIndex, getChapterNeighbors, type BookCatalog, type ChapterCatalogEntry } from "./navigation";
import { prefetchVolume } from "./load-volume";

const root = "/books/yuanhaiziping";

function Directory({ catalog, current, onNavigate }: { catalog: BookCatalog; current: ChapterCatalogEntry; onNavigate?: () => void }) {
  return (
    <nav className="book-directory" aria-label="篇章目录">
      {catalog.volumes.map((volume) => (
        <details key={volume.id} open={volume.id === current.volumeId}>
          <summary>{volume.title}<span aria-hidden="true">⌄</span></summary>
          <ol>
            {volume.chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link aria-current={chapter.id === current.id ? "page" : undefined} to={`${root}/chapters/${chapter.id}`} onClick={onNavigate}>
                  <span>{String(chapter.order).padStart(2, "0")}</span>{chapter.title}
                </Link>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </nav>
  );
}

function Drawer({ catalog, current }: { catalog: BookCatalog; current: ChapterCatalogEntry }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLElement>("button, a, summary")?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function trapFocus(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button, a, summary") ?? [])].filter((item) => !item.hasAttribute("disabled"));
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return (
    <>
      <button ref={triggerRef} className="mobile-directory-trigger" type="button" aria-expanded={open} onClick={() => setOpen(true)}><Menu aria-hidden="true" size={18} />目录</button>
      {open && (
        <div className="mobile-directory-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div ref={dialogRef} className="mobile-directory-drawer" role="dialog" aria-modal="true" aria-label="移动端篇章目录" onKeyDown={trapFocus}>
            <header><div><span>渊海子平</span><strong>全书目录</strong></div><button type="button" aria-label="关闭目录" onClick={close}><X aria-hidden="true" size={20} /></button></header>
            <Directory catalog={catalog} current={current} onNavigate={close} />
          </div>
        </div>
      )}
    </>
  );
}

function Neighbor({ direction, chapter, currentVolumeId }: { direction: "previous" | "next"; chapter: ChapterCatalogEntry | null; currentVolumeId: string }) {
  const previous = direction === "previous";
  const content: ReactNode = <><small>{previous ? "上一篇" : "下一篇"}</small><strong>{chapter?.title ?? (previous ? "全书之始" : "全书之末")}</strong></>;
  if (!chapter) return <span className="is-unavailable">{previous && <ArrowLeft aria-hidden="true" size={17} />}{content}{!previous && <ArrowRight aria-hidden="true" size={17} />}</span>;
  const crossVolume = chapter.volumeId !== currentVolumeId;
  const prefetch = () => { if (crossVolume) prefetchVolume(chapter.volumeId); };
  return <Link to={`${root}/chapters/${chapter.id}`} onMouseEnter={() => { if (matchMedia("(hover: hover)").matches) prefetch(); }} onFocus={prefetch}>{previous && <ArrowLeft aria-hidden="true" size={17} />}{content}{!previous && <ArrowRight aria-hidden="true" size={17} />}</Link>;
}

export interface ChapterReaderProps {
  catalog: BookCatalog;
  chapter: ChapterCatalogEntry;
  source?: string;
  error?: string;
  loading?: boolean;
  onRetry: () => void;
}

export default function ChapterReader({ catalog, chapter, source, error, loading, onRetry }: ChapterReaderProps) {
  const index = buildBookIndex(catalog);
  const volume = index.volumeById.get(chapter.volumeId)!;
  const neighbors = getChapterNeighbors(chapter.id, index);
  return (
    <>
      <Drawer catalog={catalog} current={chapter} />
      <main className="reader">
        <aside className="reader-directory"><header><span>渊海子平</span><strong>全书目录</strong></header><Directory catalog={catalog} current={chapter} /></aside>
        <section className="reader-stage">
          <nav className="book-breadcrumbs" aria-label="当前位置"><Link to={root}>典籍</Link><span>/</span><Link to={root}>渊海子平</Link><span>/</span><Link to={`${root}/volumes/${volume.id}`}>{volume.title}</Link><span>/</span><strong>{chapter.title}</strong></nav>
          <article className="chapter-article">
            <header className="chapter-heading"><p>{volume.title} · 第 {chapter.order} 篇</p><h1>{chapter.title}</h1><span>{catalog.book.author} 编</span></header>
            <div className="chapter-prose">
              {loading && <p className="reader-status" aria-live="polite">正在载入本卷正文…</p>}
              {error && <div className="reader-error" role="alert"><strong>本篇内容无法渲染</strong><p>{error}</p><button type="button" onClick={onRetry}>重试当前卷</button></div>}
              {!loading && !error && source !== undefined && <RestrictedMarkdown source={source} />}
            </div>
            <nav className="chapter-neighbors" aria-label="相邻篇章"><Neighbor direction="previous" chapter={neighbors.previous} currentVolumeId={chapter.volumeId} /><Neighbor direction="next" chapter={neighbors.next} currentVolumeId={chapter.volumeId} /></nav>
          </article>
        </section>
      </main>
    </>
  );
}
