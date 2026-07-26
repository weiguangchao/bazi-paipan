import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
for (const bookId of ["yuanhaiziping", "sanmingtonghui"]) {
  const directory = path.join(root, "src/books", bookId);
  const catalog = JSON.parse(readFileSync(path.join(directory, "catalog.json"), "utf8"));
  const chapterVolumeMap = Object.fromEntries(
    catalog.volumes.flatMap((volume) =>
      volume.chapters.map((chapter) => [chapter.id, volume.id]),
    ),
  );
  writeFileSync(
    path.join(directory, "chapter-volume-map.json"),
    `${JSON.stringify(chapterVolumeMap, null, 2)}\n`,
  );
  console.log(`${bookId}：已生成 ${Object.keys(chapterVolumeMap).length} 条篇章卷映射`);
}
