import { describe, expect, test, vi } from "vitest";
import {
  BookRegistry,
  type BookSummary,
} from "@/books/shared/book-registry";
import {
  createBookRuntime,
  type BookCatalog,
} from "@/books/shared/book-runtime";
import { formatBookAttribution } from "@/books/shared/book-attribution";
import { resolveBooksPath } from "@/books/shared/navigation";

const catalog: BookCatalog = {
  book: {
    id: "fixture",
    order: 1,
    title: "测试典籍",
    attribution: [{ name: "测试译者", role: "译" }],
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

function syntheticRuntime() {
  return createBookRuntime(catalog, {
    first: async () => ({
      default: { start: "首篇正文", second: "次篇正文" },
    }),
    later: async () => ({ default: { last: "末篇正文" } }),
  });
}

describe("BookRegistry", () => {
  test("按显式登记顺序暴露轻量摘要，读取首页时不加载 runtime", () => {
    const loadRuntime = vi.fn(async () => syntheticRuntime());
    const summaries: BookSummary[] = [
      {
        bookId: "fixture",
        title: "测试典籍",
        attribution: [{ name: "测试译者", role: "译" }],
        description: "测试简介",
        volumeCount: 2,
        chapterCount: 3,
        loadRuntime,
      },
    ];
    const registry = new BookRegistry(summaries);

    expect(registry.list()).toEqual(summaries);
    expect(registry.find("fixture")).toBe(summaries[0]);
    expect(loadRuntime).not.toHaveBeenCalled();
  });
});

describe("典籍署名 formatter", () => {
  test("统一展示一项与多项有序责任者", () => {
    expect(
      formatBookAttribution([{ name: "唐三藏法师玄奘", role: "译" }]),
    ).toBe("唐三藏法师玄奘 译");
    expect(
      formatBookAttribution([
        { name: "（清）余春台", role: "辑" },
        { name: "徐乐吾", role: "评注" },
      ]),
    ).toBe("（清）余春台 辑 · 徐乐吾 评注");
  });
});

describe("典籍 runtime", () => {
  test("构造时只读取一次 catalog 卷顺序，后续解析与读取复用同一 index", async () => {
    let volumeReads = 0;
    const observedCatalog = {
      ...catalog,
      get volumes() {
        volumeReads += 1;
        return catalog.volumes;
      },
    };
    const runtime = createBookRuntime(observedCatalog, {
      first: async () => ({
        default: { start: "首篇正文", second: "次篇正文" },
      }),
      later: async () => ({ default: { last: "末篇正文" } }),
    });

    runtime.resolvePath("/books/fixture");
    runtime.resolvePath("/books/fixture/chapters/second");
    await runtime.readChapter("last");

    expect(volumeReads).toBe(1);
  });

  test.each([
    ["/books/fixture", { kind: "book" }],
    ["/books/fixture/volumes/first", { kind: "volume", volume: { id: "first" } }],
    ["/books/fixture/chapters/start", { kind: "chapter", chapter: { id: "start" } }],
  ])("%s 由同一 runtime 解析", (path, expected) => {
    expect(syntheticRuntime().resolvePath(path)).toMatchObject(expected);
  });

  test("仅规范化有效地址的末尾斜杠，未知、旧 ID 与非法大小写均为 Not Found", () => {
    const runtime = syntheticRuntime();
    expect(runtime.resolvePath("/books/fixture/chapters/start/")).toEqual({
      kind: "redirect",
      to: "/books/fixture/chapters/start",
    });
    for (const path of [
      "/books/fixture/chapters/old",
      "/books/fixture/chapters/START",
      "/books/fixture/volumes/unknown",
      "/books/another/chapters/start",
      "/books/fixture/chapters/missing/",
    ]) {
      expect(runtime.resolvePath(path)).toEqual({ kind: "not-found" });
    }
  });

  test("读取结果包含卷、正文与严格按 catalog 排序且不跨典籍的相邻篇章", async () => {
    const runtime = syntheticRuntime();

    await expect(runtime.readChapter("start")).resolves.toMatchObject({
      chapter: { id: "start" },
      volume: { id: "first" },
      source: "首篇正文",
      previous: null,
      next: { id: "second" },
    });
    await expect(runtime.readChapter("second")).resolves.toMatchObject({
      previous: { id: "start" },
      next: { id: "last" },
    });
    await expect(runtime.readChapter("last")).resolves.toMatchObject({
      previous: { id: "second" },
      next: null,
    });
    await expect(runtime.readChapter("missing")).rejects.toThrow("未知篇章");
  });

  test("首次失败后再次通过同一个 readChapter 恢复", async () => {
    let failed = false;
    const runtime = createBookRuntime(catalog, {
      first: async () => {
        if (!failed) {
          failed = true;
          throw new Error("network");
        }
        return { default: { start: "恢复后的正文", second: "次篇正文" } };
      },
      later: async () => ({ default: { last: "末篇正文" } }),
    });

    await expect(runtime.readChapter("start")).rejects.toThrow("network");
    await expect(runtime.readChapter("start")).resolves.toMatchObject({
      chapter: { id: "start" },
      source: "恢复后的正文",
      next: { id: "second" },
    });
  });
});

describe("共享典籍入口", () => {
  const registry = new BookRegistry([
    {
      bookId: "fixture",
      title: "测试典籍",
      attribution: [{ name: "测试译者", role: "译" }],
      description: "测试简介",
      volumeCount: 2,
      chapterCount: 3,
      loadRuntime: async () => syntheticRuntime(),
    },
  ]);

  test.each([
    ["/books", { kind: "index" }],
    ["/books/fixture", { kind: "book", bookId: "fixture" }],
    ["/books/fixture/volumes/first", { kind: "book-resource", bookId: "fixture" }],
    ["/books/fixture/chapters/start", { kind: "book-resource", bookId: "fixture" }],
  ])("%s 解析到已登记典籍", (path, expected) => {
    expect(resolveBooksPath(path, registry)).toMatchObject(expected);
  });

  test("入口只规范化 /books/，未知典籍与非法大小写保持 Not Found", () => {
    expect(resolveBooksPath("/books/", registry)).toEqual({
      kind: "redirect",
      to: "/books",
    });
    expect(resolveBooksPath("/books/unknown", registry)).toEqual({ kind: "not-found" });
    expect(resolveBooksPath("/Books", registry)).toEqual({ kind: "not-found" });
  });
});
