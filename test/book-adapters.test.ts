import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { bookRegistry } from "@/books/registry";

const expected = [
  {
    bookId: "yuanhaiziping",
    title: "渊海子平",
    attribution: { name: "（宋）徐大升", role: "编" },
    volumeCount: 5,
    chapterCount: 269,
  },
  {
    bookId: "sanmingtonghui",
    title: "三命通会",
    attribution: { name: "（明）万民英", role: "编" },
    volumeCount: 12,
    chapterCount: 370,
  },
  {
    bookId: "wudenghuiyuan",
    title: "五灯会元",
    attribution: { name: "（宋）释普济", role: "编" },
    volumeCount: 20,
    chapterCount: 1739,
  },
  {
    bookId: "xinjing",
    title: "般若波罗蜜多心经",
    attribution: { name: "唐三藏法师玄奘", role: "译" },
    volumeCount: 1,
    chapterCount: 1,
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
      attribution: book.attribution,
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

test("《三命通会》卷十二新增篇章不改变既有稳定链接", async () => {
  const summary = bookRegistry.find("sanmingtonghui");
  if (!summary) throw new Error("缺少《三命通会》摘要");

  const runtime = await summary.loadRuntime();
  const volume = runtime.catalog.volumes.find(({ id }) => id === "v12");

  expect(volume?.chapters.map(({ id, title }) => ({ id, title }))).toEqual([
    { id: "v12-c001", title: "元理赋" },
    { id: "v12-c002", title: "真寳赋" },
    { id: "v12-c003", title: "金声玉振赋" },
    { id: "v12-c004", title: "金鼎神秘赋" },
    { id: "v12-c005", title: "元机赋" },
    { id: "v12-c006", title: "络绎赋" },
    { id: "v12-c007", title: "金玉赋" },
    { id: "v12-c008", title: "心镜五七赋" },
    { id: "v12-c014", title: "造微论" },
    { id: "v12-c009", title: "人鉴论" },
    { id: "v12-c010", title: "元妙论" },
    { id: "v12-c015", title: "精微论" },
    { id: "v12-c011", title: "惊神论" },
    { id: "v12-c012", title: "明津先生骨髓歌" },
    { id: "v12-c013", title: "搜髓歌" },
    { id: "v12-c016", title: "四言独步" },
    { id: "v12-c017", title: "五言独步" },
  ]);
});
