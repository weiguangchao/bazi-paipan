import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import catalogData from "./catalog.json";
import { buildBookIndex, resolveBookPath, type BookCatalog } from "./navigation";

const catalog = catalogData as BookCatalog;
const index = buildBookIndex(catalog);
const root = `/books/${catalog.book.id}`;

function BookHome() {
  const first = index.chapters[0];
  return (
    <main className="book-home">
      <section className="book-hero">
        <div className="book-seal" aria-hidden="true">渊海<br />子平</div>
        <div>
          <p>命理典籍 · 五卷</p>
          <h1>{catalog.book.title}</h1>
          <h2>{catalog.book.author} 编</h2>
          <p className="book-intro">{catalog.book.description}</p>
          {first && <Link className="book-primary-link" to={`${root}/chapters/${first.id}`}>从第一篇开始 <ArrowRight aria-hidden="true" size={17} /></Link>}
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

function VolumeHome({ volumeId }: { volumeId: string }) {
  const volume = index.volumeById.get(volumeId);
  if (!volume) return <BookNotFound />;
  return (
    <main className="volume-home">
      <nav aria-label="当前位置"><Link to={root}>典籍</Link><span>/</span><span>{catalog.book.title}</span><span>/</span><strong>{volume.title}</strong></nav>
      <header><p>第 {volume.order} 卷 · {volume.chapters.length} 篇</p><h1>{volume.title}</h1></header>
      <ol>
        {volume.chapters.map((chapter) => (
          <li key={chapter.id}><Link to={`${root}/chapters/${chapter.id}`}><span>{String(chapter.order).padStart(2, "0")}</span>{chapter.title}</Link></li>
        ))}
      </ol>
    </main>
  );
}

export function BookNotFound() {
  return (
    <main className="book-not-found">
      <p>典籍 · 未找到</p>
      <h1>此页不存在</h1>
      <p>地址可能无效或内容已经调整。我们没有替你猜测另一个篇章。</p>
      <Link to={root}>返回《渊海子平》首页</Link>
    </main>
  );
}

export default function CatalogRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const resolution = resolveBookPath(`${location.pathname}${location.search}`, index);

  useEffect(() => {
    if (resolution.kind === "redirect") navigate(`${resolution.to}${location.search}`, { replace: true });
  }, [location.search, navigate, resolution]);

  if (resolution.kind === "book") return <BookHome />;
  if (resolution.kind === "volume") return <VolumeHome volumeId={resolution.volume.id} />;
  if (resolution.kind === "redirect") return <main className="book-loading" aria-live="polite">正在打开典籍…</main>;
  return <BookNotFound />;
}
