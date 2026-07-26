import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(path.join(root, "dist/.vite/manifest.json"), "utf8"));
const catalog = JSON.parse(readFileSync(path.join(root, "src/pages/books/yuanhaiziping/catalog.json"), "utf8"));
const chapterVolumeMapPath = path.join(root, "src/pages/books/yuanhaiziping/chapter-volume-map.json");
const chapterVolumeMap = JSON.parse(readFileSync(chapterVolumeMapPath, "utf8"));
const expectedChapterVolumeMap = Object.fromEntries(
  catalog.volumes.flatMap((volume) =>
    volume.chapters.map((chapter) => [chapter.id, volume.id]),
  ),
);

if (JSON.stringify(chapterVolumeMap) !== JSON.stringify(expectedChapterVolumeMap)) {
  throw new Error("篇章卷映射与 catalog.json 不一致；请运行 npm run build:book-volume-map");
}

const volumeEntries = Object.entries(manifest)
  .filter(([source]) => /src\/pages\/books\/yuanhaiziping\/volumes\/v[1-5]\.ts$/.test(source))
  .sort(([left], [right]) => left.localeCompare(right));

if (volumeEntries.length !== 5) {
  throw new Error(`正文 chunk 必须恰好五个，实际 manifest 条目为 ${volumeEntries.length}`);
}

const volumeFiles = new Set(volumeEntries.map(([, entry]) => entry.file));
if (volumeFiles.size !== 5) throw new Error("每卷正文必须形成独立 chunk");

let totalGzip = 0;
for (const [source, entry] of volumeEntries) {
  const bytes = readFileSync(path.join(root, "dist", entry.file));
  const gzipBytes = gzipSync(bytes).byteLength;
  totalGzip += gzipBytes;
  if (gzipBytes > 80 * 1024) {
    throw new Error(`${source} 为 ${(gzipBytes / 1024).toFixed(2)} KB gzip，超过 80 KB`);
  }
}
if (totalGzip > 250 * 1024) {
  throw new Error(`五卷正文合计 ${(totalGzip / 1024).toFixed(2)} KB gzip，超过 250 KB`);
}

const javascriptFiles = Object.values(manifest)
  .map((entry) => entry.file)
  .filter((file, index, files) => file.endsWith(".js") && files.indexOf(file) === index);
const outputByFile = new Map(
  javascriptFiles.map((file) => [file, readFileSync(path.join(root, "dist", file), "utf8")]),
);

for (const volume of catalog.volumes) {
  const owner = volumeEntries.find(([source]) => source.endsWith(`/volumes/${volume.id}.ts`))?.[1].file;
  if (!owner) throw new Error(`缺少 ${volume.id} 正文 chunk`);
  for (const chapter of volume.chapters) {
    const chapterSource = readFileSync(path.join(root, chapter.path), "utf8");
    if (chapterSource.trim().length === 0) throw new Error(`${chapter.id} 正文为空`);
    const signature = `../../../../../${chapter.path}`;
    const owners = [...outputByFile].filter(([, output]) => output.includes(signature)).map(([file]) => file);
    if (owners.length !== 1 || owners[0] !== owner) {
      throw new Error(`${chapter.id} 正文归属异常：${owners.join(", ") || "未进入构建产物"}`);
    }
  }
}

console.log(`典籍构建检查通过：5 个正文 chunk，合计 ${(totalGzip / 1024).toFixed(2)} KB gzip`);
