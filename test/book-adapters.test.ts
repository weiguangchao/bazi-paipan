import { describe, expect, test } from "vitest";
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
];

describe.each(expected)("$title adapter", (book) => {
  test("registry 摘要、catalog、定位与逐卷正文满足统一契约", async () => {
    const summary = bookRegistry.find(book.bookId);
    expect(summary).toMatchObject(book);
    if (!summary) throw new Error("缺少典籍摘要");

    const definition = await summary.loadDefinition();
    const chapters = definition.catalog.volumes.flatMap((volume) => volume.chapters);
    expect(definition.catalog.book).toMatchObject({
      id: book.bookId,
      title: book.title,
      author: book.author,
    });
    expect(definition.catalog.volumes).toHaveLength(book.volumeCount);
    expect(chapters).toHaveLength(book.chapterCount);
    expect(new Set(chapters.map((chapter) => chapter.id)).size).toBe(book.chapterCount);

    for (const volume of definition.catalog.volumes) {
      for (const chapter of volume.chapters) {
        expect(definition.locateChapter(chapter.id)).toBe(volume.id);
      }
      const content = await definition.loadVolume(volume.id, "normal");
      expect(Object.keys(content)).toHaveLength(volume.chapters.length);
      for (const chapter of volume.chapters) {
        expect(content).toHaveProperty(chapter.id);
        if (!["v4-c001", "v4-c007"].includes(chapter.id) || book.bookId !== "sanmingtonghui") {
          expect(content[chapter.id]?.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
