import { describe, expect, test } from "vitest";
import catalog from "@/pages/books/yuanhaiziping/catalog.json";
import {
  buildBookIndex,
  getChapterNeighbors,
  resolveBookPath,
} from "@/pages/books/yuanhaiziping/navigation";

const index = buildBookIndex(catalog);

describe("典籍路径解析", () => {
  test.each([
    ["/books/yuanhaiziping", "book"],
    ["/books/yuanhaiziping?from=nav", "book"],
    ["/books/yuanhaiziping/volumes/v1", "volume"],
    ["/books/yuanhaiziping/chapters/v1-c001", "chapter"],
  ])("%s 解析为 %s", (path, kind) => {
    expect(resolveBookPath(path, index)).toMatchObject({ kind });
  });

  test("仅末尾斜杠差异需要 replace 规范化", () => {
    expect(resolveBookPath("/books/yuanhaiziping/chapters/v1-c001/", index)).toEqual({
      kind: "redirect",
      to: "/books/yuanhaiziping/chapters/v1-c001",
    });
  });

  test.each([
    "/books/YuanHaiZiPing",
    "/books/yuanhaiziping/volumes/V1",
    "/books/yuanhaiziping/chapters/v1_c001",
    "/books/yuanhaiziping/chapters/unknown",
    "/books/yuanhaiziping/chapters",
  ])("%s 保持原地址并进入 Not Found", (path) => {
    expect(resolveBookPath(path, index)).toEqual({ kind: "not-found" });
  });

  test("仅显式登记的旧 ID 才 replace 到 canonical 地址", () => {
    expect(
      resolveBookPath("/books/yuanhaiziping/chapters/legacy-first", index, {
        "legacy-first": "v1-c001",
      }),
    ).toEqual({
      kind: "redirect",
      to: "/books/yuanhaiziping/chapters/v1-c001",
    });
  });
});

describe("相邻篇章", () => {
  test("全书首尾保留空邻居", () => {
    expect(getChapterNeighbors("v1-c001", index).previous).toBeNull();
    expect(getChapterNeighbors("v5-c065", index).next).toBeNull();
  });

  test.each([
    ["v1-c069", "v2-c001"],
    ["v2-c070", "v3-c001"],
    ["v3-c038", "v4-c001"],
    ["v4-c027", "v5-c001"],
  ])("%s 的下一篇跨卷连接到 %s", (current, next) => {
    expect(getChapterNeighbors(current, index).next?.id).toBe(next);
  });

  test("顺序由清单而非 ID 或篇名推导，并防御空卷和单篇卷", () => {
    const synthetic = buildBookIndex({
      book: catalog.book,
      volumes: [
        { id: "v9", title: "卷九", order: 1, chapters: [] },
        {
          id: "v2",
          title: "卷二",
          order: 2,
          chapters: [
            {
              id: "v2-c900",
              title: "唯一篇",
              volumeId: "v2",
              order: 99,
              path: "unused",
              sourceStartLine: 1,
              sourceEndLine: 2,
            },
          ],
        },
      ],
    });

    expect(getChapterNeighbors("v2-c900", synthetic)).toEqual({
      previous: null,
      next: null,
    });
  });
});
