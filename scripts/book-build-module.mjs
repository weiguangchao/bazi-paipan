const knownExceptionKinds = new Set([
  "catalog-body-title-difference",
  "duplicate-title",
  "inferred-title",
  "title-only-empty-body",
]);

function fail(bookId, message) {
  throw new Error(`${bookId}：${message}`);
}

function assertSequentialOrder(bookId, entries, kind, parentId) {
  entries.forEach((entry, index) => {
    const expected = index + 1;
    if (entry.order !== expected) {
      fail(
        bookId,
        `${parentId ? `${parentId} ` : ""}${kind}顺序错误：${entry.id} 应为 ${expected}，实际为 ${entry.order}`,
      );
    }
  });
}

export function deriveBookBuild({ catalog, audit = {}, chapterContents }) {
  const bookId = catalog?.book?.id;
  if (!bookId) throw new Error("catalog 缺少 book.id");
  const volumes = catalog.volumes ?? [];
  assertSequentialOrder(bookId, volumes, "卷");

  const volumeIds = new Set();
  const chapterIds = new Set();
  const chapterById = new Map();
  const chapterVolumeMap = {};
  for (const volume of volumes) {
    if (volumeIds.has(volume.id)) fail(bookId, `重复卷 ID：${volume.id}`);
    volumeIds.add(volume.id);
    assertSequentialOrder(bookId, volume.chapters ?? [], "篇章", volume.id);
    for (const chapter of volume.chapters ?? []) {
      if (chapterIds.has(chapter.id)) fail(bookId, `重复篇章 ID：${chapter.id}`);
      if (chapter.volumeId !== volume.id) {
        fail(bookId, `${chapter.id} 的 volumeId 应为 ${volume.id}，实际为 ${chapter.volumeId}`);
      }
      chapterIds.add(chapter.id);
      chapterById.set(chapter.id, chapter);
      chapterVolumeMap[chapter.id] = volume.id;
    }
  }

  const allowedEmptyChapterIds = new Set();
  const exceptions = [
    ...(audit.warnings ?? []),
    ...(audit.knownExceptions ?? []),
  ];
  for (const exception of exceptions) {
    if (!knownExceptionKinds.has(exception.kind)) {
      fail(bookId, `未知内容例外：${exception.kind}`);
    }
    const referencedChapterIds = [
      ...(exception.chapterIds ?? []),
      ...(exception.chapterId ? [exception.chapterId] : []),
    ];
    if (referencedChapterIds.length === 0) {
      fail(bookId, `${exception.kind} 缺少篇章引用`);
    }
    for (const chapterId of referencedChapterIds) {
      if (!chapterIds.has(chapterId)) fail(bookId, `例外引用未知篇章：${chapterId}`);
      if (exception.kind === "title-only-empty-body") {
        allowedEmptyChapterIds.add(chapterId);
      }
    }
    if (typeof exception.resolution !== "string" || exception.resolution.trim() === "") {
      fail(bookId, `${exception.kind} 缺少 resolution`);
    }

    if (exception.kind === "title-only-empty-body" && chapterContents) {
      for (const chapterId of referencedChapterIds) {
        const source = chapterContents[chapterId];
        if (typeof source === "string" && source.trim() !== "") {
          fail(bookId, `${exception.kind} 引用 ${chapterId}，但正文并非空白`);
        }
      }
    }
    if (exception.kind === "duplicate-title") {
      if (referencedChapterIds.length < 2) {
        fail(bookId, `${exception.kind} 至少需要两个篇章引用`);
      }
      const titles = new Set(
        referencedChapterIds.map((chapterId) => chapterById.get(chapterId)?.title),
      );
      if (titles.size !== 1) fail(bookId, `${exception.kind} 引用的篇章标题并不相同`);
    }
    if (exception.kind === "catalog-body-title-difference") {
      const chapter = chapterById.get(referencedChapterIds[0]);
      if (
        referencedChapterIds.length !== 1
        || typeof exception.catalogTitle !== "string"
        || typeof exception.bodyTitle !== "string"
        || exception.catalogTitle === exception.bodyTitle
        || chapter?.title !== exception.bodyTitle
      ) {
        fail(
          bookId,
          `${exception.kind} 的 bodyTitle 必须等于 catalog 篇章标题 ${chapter?.title ?? "未知"}`,
        );
      }
    }
    if (exception.kind === "inferred-title") {
      const chapter = chapterById.get(referencedChapterIds[0]);
      if (
        referencedChapterIds.length !== 1
        || exception.sourceTitle !== ""
        || exception.catalogTitle !== chapter?.title
      ) {
        fail(
          bookId,
          `${exception.kind} 的 catalogTitle 必须等于 catalog 篇章标题 ${chapter?.title ?? "未知"}`,
        );
      }
    }
  }

  if (chapterContents) {
    for (const chapterId of chapterIds) {
      const source = chapterContents[chapterId];
      if (typeof source !== "string") fail(bookId, `${chapterId} 缺失正文`);
      if (source.trim() === "" && !allowedEmptyChapterIds.has(chapterId)) {
        fail(bookId, `${chapterId} 正文为空且未登记例外`);
      }
    }
    for (const chapterId of Object.keys(chapterContents)) {
      if (!chapterIds.has(chapterId)) fail(bookId, `正文不在 catalog：${chapterId}`);
    }
  }

  return {
    summary: {
      bookId,
      order: catalog.book.order,
      title: catalog.book.title,
      author: catalog.book.author,
      description: catalog.book.description,
      volumeCount: volumes.length,
      chapterCount: chapterIds.size,
    },
    chapterVolumeMap,
    allowedEmptyChapterIds,
  };
}

function catalogBindingName(bookId) {
  const camelBookId = bookId.replace(
    /-([a-z0-9])/g,
    (_, character) => character.toUpperCase(),
  );
  return `${camelBookId}Catalog`;
}

function renderRegistry(catalogs) {
  const ordered = [...catalogs].sort((left, right) => left.book.order - right.book.order);
  const imports = ordered.map(
    (catalog) =>
      `import ${catalogBindingName(catalog.book.id)} from "./${catalog.book.id}/catalog.json";`,
  );
  const entries = ordered.map((catalog) => `  {
    catalog: ${catalogBindingName(catalog.book.id)} as BookCatalog,
    loadDefinition: () => import("./${catalog.book.id}/definition").then((module) => module.default),
  }`);
  return `${imports.join("\n")}
import { BookRegistry, summaryFromCatalog } from "./shared/book-definition";
import type { BookCatalog } from "./shared/navigation";

export const bookRegistry = new BookRegistry([
${entries.join(",\n")}
].map(({ catalog, loadDefinition }) => summaryFromCatalog(catalog, loadDefinition)));
`;
}

function renderDefinition(bookId, volumes) {
  const imports = volumes.map(
    (volume) => `  ${volume.id}: () => import("./volumes/${volume.id}"),`,
  );
  return `import catalogData from "./catalog.json";
import { createBookDefinition } from "@/books/shared/create-book-definition";
import type { BookCatalog } from "@/books/shared/navigation";

const volumeImports = {
${imports.join("\n")}
};

export default createBookDefinition(
  catalogData as BookCatalog,
  volumeImports,
);
`;
}

function renderVolume(bookId, volume) {
  const chapterSignature = createHash("sha256")
    .update(JSON.stringify(volume.chapters))
    .digest("hex");
  return `// Catalog chapters: ${chapterSignature}
import { chapterContentFromModules } from "@/books/shared/from-modules";
export default chapterContentFromModules(import.meta.glob("../../../../content/books/${bookId}/chapters/${volume.id}/*.md", { eager: true, query: "?raw", import: "default" }));
`;
}

export function renderGeneratedAdapters(catalogs) {
  const bookIds = new Set();
  const bookOrders = new Set();
  for (const catalog of catalogs) {
    deriveBookBuild({ catalog });
    if (bookIds.has(catalog.book.id)) throw new Error(`重复典籍 ID：${catalog.book.id}`);
    if (!Number.isInteger(catalog.book.order) || catalog.book.order < 1) {
      fail(catalog.book.id, `典籍展示顺序无效：${catalog.book.order}`);
    }
    if (bookOrders.has(catalog.book.order)) {
      fail(catalog.book.id, `重复典籍展示顺序：${catalog.book.order}`);
    }
    bookIds.add(catalog.book.id);
    bookOrders.add(catalog.book.order);
  }
  [...bookOrders]
    .sort((left, right) => left - right)
    .forEach((order, index) => {
      if (order !== index + 1) {
        throw new Error(`典籍展示顺序错误：应为 ${index + 1}，实际为 ${order}`);
      }
    });

  const output = { "src/books/registry.ts": renderRegistry(catalogs) };
  for (const catalog of catalogs) {
    const bookId = catalog.book.id;
    output[`src/books/${bookId}/definition.ts`] = renderDefinition(bookId, catalog.volumes);
    for (const volume of catalog.volumes) {
      output[`src/books/${bookId}/volumes/${volume.id}.ts`] = renderVolume(bookId, volume);
    }
  }
  return output;
}

export function findGeneratedAdapterDrift(expected, actual) {
  const drift = [];
  for (const file of Object.keys(expected).sort()) {
    if (!(file in actual)) drift.push(`缺失：${file}`);
    else if (actual[file] !== expected[file]) drift.push(`内容陈旧：${file}`);
  }
  for (const file of Object.keys(actual).sort()) {
    if (!(file in expected)) drift.push(`多余：${file}`);
  }
  return drift;
}

export function validateBuildArtifacts({ books, outputs }) {
  let totalVolumeChunks = 0;
  const results = [];
  const chunkOwnerByFile = new Map();
  for (const book of books) {
    const { summary } = deriveBookBuild({ catalog: book.catalog });
    const chunks = book.volumeChunks;
    if (chunks.length !== summary.volumeCount) {
      fail(book.bookId, `正文 chunk 应为 ${summary.volumeCount} 个，实际为 ${chunks.length}`);
    }
    totalVolumeChunks += chunks.length;
    if (new Set(chunks.map((chunk) => chunk.file)).size !== summary.volumeCount) {
      fail(book.bookId, "每卷正文必须形成独立 chunk");
    }

    let totalGzipBytes = 0;
    for (const chunk of chunks) {
      const existingOwner = chunkOwnerByFile.get(chunk.file);
      if (existingOwner) {
        fail(
          book.bookId,
          `${chunk.file} 与 ${existingOwner} 共用正文 chunk，存在跨书泄漏`,
        );
      }
      chunkOwnerByFile.set(chunk.file, chunk.source);
      totalGzipBytes += chunk.gzipBytes;
      if (chunk.gzipBytes > book.budgets.volumeGzipBytes) {
        fail(
          book.bookId,
          `${chunk.source} 超过单卷 gzip 预算：${chunk.gzipBytes} > ${book.budgets.volumeGzipBytes}`,
        );
      }
    }
    if (totalGzipBytes > book.budgets.bookGzipBytes) {
      fail(
        book.bookId,
        `正文合计超过全书 gzip 预算：${totalGzipBytes} > ${book.budgets.bookGzipBytes}`,
      );
    }

    for (const volume of book.catalog.volumes) {
      const expectedChunk = chunks.find(
        (chunk) => chunk.source === `src/books/${book.bookId}/volumes/${volume.id}.ts`,
      );
      if (!expectedChunk) fail(book.bookId, `缺少 ${volume.id} 正文 chunk`);
      for (const chapter of volume.chapters) {
        const signature =
          `../../../../content/books/${book.bookId}/chapters/${volume.id}/${chapter.id}.md`;
        const owners = Object.entries(outputs)
          .filter(([, source]) => source.includes(signature))
          .map(([file]) => file);
        if (owners.length !== 1 || owners[0] !== expectedChunk.file) {
          fail(
            book.bookId,
            `${chapter.id} 正文归属异常：${owners.join(", ") || "未进入构建产物"}`,
          );
        }
      }
    }
    results.push({
      bookId: book.bookId,
      volumeChunks: chunks.length,
      totalGzipBytes,
    });
  }
  return { totalVolumeChunks, books: results };
}
import { createHash } from "node:crypto";
