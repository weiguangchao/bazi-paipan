import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const catalog = JSON.parse(
  readFileSync(path.join(root, "src/pages/books/yuanhaiziping/catalog.json"), "utf8"),
);
const chapterVolumeMap = Object.fromEntries(
  catalog.volumes.flatMap((volume) =>
    volume.chapters.map((chapter) => [chapter.id, volume.id]),
  ),
);
const outputPath = path.join(
  root,
  "src/pages/books/yuanhaiziping/chapter-volume-map.json",
);

writeFileSync(outputPath, `${JSON.stringify(chapterVolumeMap, null, 2)}\n`);
console.log(`已从 catalog.json 生成 ${Object.keys(chapterVolumeMap).length} 条篇章卷映射`);
