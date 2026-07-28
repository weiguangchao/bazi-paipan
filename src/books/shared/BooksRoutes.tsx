import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ArrowRight } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { bookRegistry } from "@/books/registry";
import { formatBookAttribution } from "./book-attribution";
import { BookRegistry } from "./book-registry";
import { resolveBooksPath } from "./navigation";
import type {
  BookRuntime,
  ChapterLocation,
  VolumeCatalogEntry,
} from "./book-runtime";

const ChapterReader = lazy(() => import("./ChapterReader"));

function BooksHome({ registry }: { registry: BookRegistry }) {
  return (
    <main className="books-home">
      <header className="books-heading">
        <p>文献阅读</p>
        <h1>典籍</h1>
        <span>循典籍结构，查阅原文。</span>
      </header>
      <section className="book-card-grid" aria-label="典籍列表">
        {registry.list().map((book) => (
          <Link key={book.bookId} to={`/books/${book.bookId}`}>
            <span>{book.volumeCount} 卷 · {book.chapterCount} 篇</span>
            <h2>{book.title}</h2>
            <strong>{formatBookAttribution(book.attribution)}</strong>
            <p>{book.description}</p>
            <small>进入典籍 <ArrowRight aria-hidden="true" size={16} /></small>
          </Link>
        ))}
      </section>
    </main>
  );
}

function BookHome({ runtime }: { runtime: BookRuntime }) {
  const { catalog } = runtime;
  const root = `/books/${catalog.book.id}`;
  const first = catalog.volumes[0]?.chapters[0];
  const chapterCount = catalog.volumes.reduce(
    (total, volume) => total + volume.chapters.length,
    0,
  );
  return (
    <main className="book-home">
      <section className="book-hero">
        <div className="book-seal" aria-hidden="true">
          {catalog.book.sealLines.map((line) => <span key={line}>{line}</span>)}
        </div>
        <div>
          <p>典籍 · {catalog.volumes.length} 卷 · {chapterCount} 篇</p>
          <h1>{catalog.book.title}</h1>
          <h2>{formatBookAttribution(catalog.book.attribution)}</h2>
          <p className="book-intro">{catalog.book.description}</p>
          {first && (
            <Link className="book-primary-link" to={`${root}/chapters/${first.id}`}>
              从第一篇开始 <ArrowRight aria-hidden="true" size={17} />
            </Link>
          )}
        </div>
      </section>
      <section className="book-index" aria-labelledby="volume-index-title">
        <header><span>全书目录</span><h2 id="volume-index-title">按卷查阅</h2></header>
        <div className="volume-grid">
          {catalog.volumes.map((volume) => (
            <Link key={volume.id} to={`${root}/volumes/${volume.id}`}>
              <span>{String(volume.order).padStart(2, "0")}</span>
              <strong>{volume.title}</strong>
              <p>{volume.chapters.slice(0, 3).map((chapter) => chapter.title).join("　")}</p>
              <small>{volume.chapters.length} 篇</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function VolumeHome({
  runtime,
  volume,
}: {
  runtime: BookRuntime;
  volume: VolumeCatalogEntry;
}) {
  const { catalog } = runtime;
  const root = `/books/${catalog.book.id}`;
  return (
    <main className="volume-home">
      <nav aria-label="当前位置">
        <Link to="/books">典籍</Link><span>/</span>
        <Link to={root}>{catalog.book.title}</Link><span>/</span>
        <strong>{volume.title}</strong>
      </nav>
      <header><p>第 {volume.order} 卷 · {volume.chapters.length} 篇</p><h1>{volume.title}</h1></header>
      <ol>
        {volume.chapters.map((chapter) => (
          <li key={chapter.id}>
            <Link to={`${root}/chapters/${chapter.id}`}>
              <span>{String(chapter.order).padStart(2, "0")}</span>{chapter.title}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}

function BookNotFound({ runtime }: { runtime?: BookRuntime }) {
  const root = runtime ? `/books/${runtime.catalog.book.id}` : "/books";
  return (
    <main className="book-not-found">
      <p>典籍 · 未找到</p>
      <h1>此页不存在</h1>
      <p>地址可能无效或内容已经调整。我们没有替你猜测另一个篇章。</p>
      <Link to={root}>
        {runtime ? `返回《${runtime.catalog.book.title}》首页` : "返回典籍首页"}
      </Link>
      {runtime && <p><Link to="/books">查看全部典籍</Link></p>}
    </main>
  );
}

function ChapterEntry({
  runtime,
  location,
}: {
  runtime: BookRuntime;
  location: ChapterLocation;
}) {
  const [source, setSource] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (
    isActive: () => boolean = () => true,
  ) => {
    if (isActive()) {
      setSource(undefined);
      setError(undefined);
      setLoading(true);
    }
    try {
      const reading = await runtime.readChapter(location.chapter.id);
      if (isActive()) setSource(reading.source);
    } catch {
      if (isActive()) setError("本卷正文载入失败，请稍后重试。");
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [location.chapter.id, runtime]);

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  return (
    <Suspense fallback={<main className="book-loading" aria-live="polite">正在打开阅读器…</main>}>
      <ChapterReader
        runtime={runtime}
        location={location}
        source={source}
        error={error}
        loading={loading}
        onRetry={() => void load()}
      />
    </Suspense>
  );
}

function LoadedBookRoutes({
  runtime,
}: {
  runtime: BookRuntime;
}) {
  const location = useLocation();
  const resolution = runtime.resolvePath(`${location.pathname}${location.search}`);
  if (resolution.kind === "redirect") {
    return <Navigate replace to={`${resolution.to}${location.search}${location.hash}`} />;
  }
  if (resolution.kind === "book") return <BookHome runtime={runtime} />;
  if (resolution.kind === "volume") {
    return <VolumeHome runtime={runtime} volume={resolution.volume} />;
  }
  if (resolution.kind === "chapter") {
    return <ChapterEntry runtime={runtime} location={resolution} />;
  }
  return <BookNotFound runtime={runtime} />;
}

function BookRuntimeEntry({
  summary,
}: {
  summary: NonNullable<ReturnType<BookRegistry["find"]>>;
}) {
  const [runtime, setRuntime] = useState<BookRuntime>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    void summary.loadRuntime()
      .then((loaded) => {
        if (active) setRuntime(loaded);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, summary]);

  if (failed) {
    return (
      <main className="book-not-found">
        <p>典籍 · 载入失败</p><h1>暂时无法打开《{summary.title}》</h1>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>重试载入</button>
      </main>
    );
  }
  if (!runtime) {
    return <main className="book-loading" aria-live="polite">正在打开《{summary.title}》…</main>;
  }
  return <LoadedBookRoutes runtime={runtime} />;
}

export function BooksRoutes({
  registry = bookRegistry,
}: {
  registry?: BookRegistry;
}) {
  const location = useLocation();
  const resolution = resolveBooksPath(`${location.pathname}${location.search}`, registry);
  if (resolution.kind === "redirect") {
    return <Navigate replace to={`${resolution.to}${location.search}${location.hash}`} />;
  }
  if (resolution.kind === "index") return <BooksHome registry={registry} />;
  if (resolution.kind === "not-found") return <BookNotFound />;
  const summary = registry.find(resolution.bookId);
  return summary ? <BookRuntimeEntry summary={summary} /> : <BookNotFound />;
}

export default BooksRoutes;
