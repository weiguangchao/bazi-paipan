import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(path.join(root, "dist/.vite/manifest.json"), "utf8"));
const javascriptFiles = Object.values(manifest)
  .map((entry) => entry.file)
  .filter((file, index, files) => file.endsWith(".js") && files.indexOf(file) === index);
const outputByFile = new Map(
  javascriptFiles.map((file) => [file, readFileSync(path.join(root, "dist", file), "utf8")]),
);

const books = [
  { bookId: "yuanhaiziping", volumeCount: 5, volumeBudgetKb: 80, totalBudgetKb: 250 },
  { bookId: "sanmingtonghui", volumeCount: 12, volumeBudgetKb: 80, totalBudgetKb: 500 },
  { bookId: "wudenghuiyuan", volumeCount: 20, volumeBudgetKb: 100, totalBudgetKb: 1280 },
];
let totalVolumeChunks = 0;

for (const book of books) {
  const directory = path.join(root, "src/books", book.bookId);
  const catalog = JSON.parse(readFileSync(path.join(directory, "catalog.json"), "utf8"));
  const chapterVolumeMap = JSON.parse(
    readFileSync(path.join(directory, "chapter-volume-map.json"), "utf8"),
  );
  const expectedChapterVolumeMap = Object.fromEntries(
    catalog.volumes.flatMap((volume) =>
      volume.chapters.map((chapter) => [chapter.id, volume.id]),
    ),
  );
  if (JSON.stringify(chapterVolumeMap) !== JSON.stringify(expectedChapterVolumeMap)) {
    throw new Error(`${book.bookId} 篇章卷映射与 catalog.json 不一致；请运行 npm run build:book-volume-map`);
  }

  const volumeEntries = Object.entries(manifest)
    .filter(([source]) => new RegExp(`src/books/${book.bookId}/volumes/v\\d+\\.ts$`).test(source))
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));
  if (volumeEntries.length !== book.volumeCount) {
    throw new Error(`${book.bookId} 正文 chunk 应为 ${book.volumeCount} 个，实际为 ${volumeEntries.length}`);
  }
  totalVolumeChunks += volumeEntries.length;
  const volumeFiles = new Set(volumeEntries.map(([, entry]) => entry.file));
  if (volumeFiles.size !== book.volumeCount) {
    throw new Error(`${book.bookId} 每卷正文必须形成独立 chunk`);
  }

  let totalGzip = 0;
  for (const [source, entry] of volumeEntries) {
    const gzipBytes = gzipSync(readFileSync(path.join(root, "dist", entry.file))).byteLength;
    totalGzip += gzipBytes;
    if (gzipBytes > book.volumeBudgetKb * 1024) {
      throw new Error(`${source} 为 ${(gzipBytes / 1024).toFixed(2)} KB gzip，超过 ${book.volumeBudgetKb} KB`);
    }
  }
  if (totalGzip > book.totalBudgetKb * 1024) {
    throw new Error(`${book.bookId} 正文合计 ${(totalGzip / 1024).toFixed(2)} KB gzip，超过 ${book.totalBudgetKb} KB`);
  }

  for (const volume of catalog.volumes) {
    const owner = volumeEntries.find(([source]) => source.endsWith(`/volumes/${volume.id}.ts`))?.[1].file;
    if (!owner) throw new Error(`${book.bookId} 缺少 ${volume.id} 正文 chunk`);
    for (const chapter of volume.chapters) {
      const chapterPath = `content/books/${book.bookId}/chapters/${volume.id}/${chapter.id}.md`;
      const chapterSource = readFileSync(path.join(root, chapterPath), "utf8");
      const allowedEmpty = book.bookId === "sanmingtonghui"
        && ["v4-c001", "v4-c007"].includes(chapter.id);
      if (!allowedEmpty && chapterSource.trim().length === 0) {
        throw new Error(`${book.bookId}/${chapter.id} 正文为空`);
      }
      const signature = `../../../../${chapterPath}`;
      const owners = [...outputByFile]
        .filter(([, output]) => output.includes(signature))
        .map(([file]) => file);
      if (owners.length !== 1 || owners[0] !== owner) {
        throw new Error(`${book.bookId}/${chapter.id} 正文归属异常：${owners.join(", ") || "未进入构建产物"}`);
      }
    }
  }
  console.log(`${book.bookId}：${volumeEntries.length} 个正文 chunk，合计 ${(totalGzip / 1024).toFixed(2)} KB gzip`);
}

if (totalVolumeChunks !== 37) {
  throw new Error(`全站正文 chunk 必须恰好 37 个，实际为 ${totalVolumeChunks}`);
}
console.log("典籍构建检查通过：全站恰好 37 个正文 chunk");
