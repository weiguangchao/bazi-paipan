import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { bookRegistry } from "@/books/registry";

const expected = [
  {
    bookId: "yuanhaiziping",
    title: "渊海子平",
    author: "（宋）徐大升",
    volumeCount: 5,
    chapterCount: 269,
  },
  {
    bookId: "sanmingtonghui",
    title: "三命通会",
    author: "（明）万民英",
    volumeCount: 12,
    chapterCount: 366,
  },
  {
    bookId: "wudenghuiyuan",
    title: "五灯会元",
    author: "（宋）释普济",
    volumeCount: 20,
    chapterCount: 1739,
  },
];

describe.each(expected)("$title adapter", (book) => {
  test("registry 摘要、catalog 与逐篇 runtime 读取满足统一契约", async () => {
    const audit = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "content/books", book.bookId, "audit.json"),
        "utf8",
      ),
    ) as {
      knownExceptions?: Array<{ kind: string; chapterIds?: string[] }>;
    };
    const allowedEmptyChapterIds = new Set(
      (audit.knownExceptions ?? [])
        .filter((exception) => exception.kind === "title-only-empty-body")
        .flatMap((exception) => exception.chapterIds ?? []),
    );
    const summary = bookRegistry.find(book.bookId);
    expect(summary).toMatchObject(book);
    if (!summary) throw new Error("缺少典籍摘要");

    const runtime = await summary.loadRuntime();
    const chapters = runtime.catalog.volumes.flatMap((volume) => volume.chapters);
    expect(runtime.catalog.book).toMatchObject({
      id: book.bookId,
      title: book.title,
      author: book.author,
    });
    expect(runtime.catalog.volumes).toHaveLength(book.volumeCount);
    expect(chapters).toHaveLength(book.chapterCount);
    expect(new Set(chapters.map((chapter) => chapter.id)).size).toBe(book.chapterCount);

    for (const volume of runtime.catalog.volumes) {
      for (const chapter of volume.chapters) {
        const reading = await runtime.readChapter(chapter.id);
        expect(reading).toMatchObject({
          chapter: { id: chapter.id },
          volume: { id: volume.id },
        });
        if (!allowedEmptyChapterIds.has(chapter.id)) {
          expect(reading.source.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
