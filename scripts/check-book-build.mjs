import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { validateBuildArtifacts } from "./book-build-module.mjs";
import { bookBuildStrategies } from "./book-build-strategies.mjs";
import {
  generateBookAdapters,
  readBookBuildInputs,
} from "./generate-book-adapters.mjs";

const root = process.cwd();
generateBookAdapters(root, { check: true });

const catalogs = readBookBuildInputs(root);
const manifest = JSON.parse(
  readFileSync(path.join(root, "dist/.vite/manifest.json"), "utf8"),
);
const javascriptFiles = [
  ...new Set(
    Object.values(manifest)
      .map((entry) => entry.file)
      .filter((file) => file.endsWith(".js")),
  ),
];
const outputs = Object.fromEntries(
  javascriptFiles.map((file) => [
    file,
    readFileSync(path.join(root, "dist", file), "utf8"),
  ]),
);
const books = catalogs.map((catalog) => {
  const bookId = catalog.book.id;
  const volumeChunks = Object.entries(manifest)
    .filter(([source]) =>
      new RegExp(`^src/books/${bookId}/volumes/[^/]+\\.ts$`).test(source)
    )
    .map(([source, entry]) => ({
      source,
      file: entry.file,
      gzipBytes: gzipSync(
        readFileSync(path.join(root, "dist", entry.file)),
      ).byteLength,
    }))
    .sort((left, right) =>
      left.source.localeCompare(right.source, undefined, { numeric: true })
    );
  return {
    bookId,
    catalog,
    budgets: bookBuildStrategies[bookId],
    volumeChunks,
  };
});

const result = validateBuildArtifacts({ books, outputs });
for (const book of result.books) {
  console.log(
    `${book.bookId}：${book.volumeChunks} 个正文 chunk，合计 ${(book.totalGzipBytes / 1024).toFixed(2)} KB gzip`,
  );
}
console.log(
  `典籍构建检查通过：全站 ${result.totalVolumeChunks} 个 catalog 派生的正文 chunk`,
);
