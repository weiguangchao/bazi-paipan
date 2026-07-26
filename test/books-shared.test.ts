import { describe, expect, test, vi } from "vitest";
import {
  BookRegistry,
  type BookDefinition,
  type BookSummary,
} from "@/books/shared/book-definition";
import {
  buildBookIndex,
  getChapterNeighbors,
  resolveBookPath,
  resolveBooksPath,
} from "@/books/shared/navigation";

const catalog = {
  book: {
    id: "fixture",
    title: "测试典籍",
    author: "测试作者",
    description: "测试简介",
    sealLines: ["测试", "典籍"],
  },
  volumes: [
    {
      id: "later",
      title: "后卷",
      order: 2,
      chapters: [
        { id: "last", title: "末篇", volumeId: "later", order: 1 },
      ],
    },
    {
      id: "first",
      title: "首卷",
      order: 1,
      chapters: [
        { id: "second", title: "次篇", volumeId: "first", order: 2 },
        { id: "start", title: "首篇", volumeId: "first", order: 1 },
      ],
    },
  ],
};

function syntheticDefinition(): BookDefinition {
  return {
    catalog,
    locateChapter: (chapterId) => ({
      start: "first",
      second: "first",
      last: "later",
    })[chapterId],
    loadVolume: vi.fn(async () => ({})),
    legacyChapterIds: { old: "start" },
  };
}

describe("BookRegistry", () => {
  test("按显式登记顺序暴露轻量摘要，读取首页时不加载 definition", () => {
    const loadDefinition = vi.fn(async () => syntheticDefinition());
    const summaries: BookSummary[] = [
      {
        bookId: "fixture",
        title: "测试典籍",
        author: "测试作者",
        description: "测试简介",
        volumeCount: 2,
        chapterCount: 3,
        loadDefinition,
      },
    ];
    const registry = new BookRegistry(summaries);

    expect(registry.list()).toEqual(summaries);
    expect(registry.find("fixture")).toBe(summaries[0]);
    expect(loadDefinition).not.toHaveBeenCalled();
  });
});

describe("共享典籍路由", () => {
  const registry = new BookRegistry([
    {
      bookId: "fixture",
      title: "测试典籍",
      author: "测试作者",
      description: "测试简介",
      volumeCount: 2,
      chapterCount: 3,
      loadDefinition: async () => syntheticDefinition(),
    },
  ]);
  const definition = syntheticDefinition();
  const index = buildBookIndex(definition.catalog);

  test.each([
    ["/books", { kind: "index" }],
    ["/books/fixture", { kind: "book", bookId: "fixture" }],
    ["/books/fixture/volumes/first", { kind: "book-resource", bookId: "fixture" }],
    ["/books/fixture/chapters/start", { kind: "book-resource", bookId: "fixture" }],
  ])("%s 由共享入口解析", (path, expected) => {
    expect(resolveBooksPath(path, registry)).toMatchObject(expected);
  });

  test("仅有效地址的末尾斜杠规范化，未知与非法地址保留为 Not Found", () => {
    expect(resolveBooksPath("/books/", registry)).toEqual({
      kind: "redirect",
      to: "/books",
    });
    expect(resolveBookPath("/books/fixture/chapters/start/", index, definition.legacyChapterIds))
      .toEqual({ kind: "redirect", to: "/books/fixture/chapters/start" });
    for (const path of [
      "/Books",
      "/books/unknown",
      "/books/fixture/chapters",
      "/books/fixture/chapters/START",
      "/books/fixture/volumes/unknown",
    ]) {
      const resolution = path.startsWith("/books/fixture/")
        ? resolveBookPath(path, index, definition.legacyChapterIds)
        : resolveBooksPath(path, registry);
      expect(resolution).toEqual({ kind: "not-found" });
    }
  });

  test("显式旧 ID 只在所属典籍内跳转，导航严格按 catalog 顺序且不跨书", () => {
    expect(resolveBookPath("/books/fixture/chapters/old", index, definition.legacyChapterIds))
      .toEqual({ kind: "redirect", to: "/books/fixture/chapters/start" });
    expect(getChapterNeighbors("start", index)).toEqual({
      previous: null,
      next: expect.objectContaining({ id: "second" }),
    });
    expect(getChapterNeighbors("second", index).next).toMatchObject({ id: "last" });
    expect(getChapterNeighbors("last", index).next).toBeNull();
  });
});
