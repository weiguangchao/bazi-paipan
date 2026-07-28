import { describe, expect, test } from "vitest";
import {
  deriveBookBuild,
  findGeneratedAdapterDrift,
  renderGeneratedAdapters,
  validateBuildArtifacts,
} from "../scripts/book-build-module.mjs";

function catalog(overrides = {}) {
  return {
    book: {
      id: "sample",
      order: 2,
      title: "示例典籍",
      attribution: {
        name: "示例作者",
        role: "编",
      },
      description: "示例简介",
      sealLines: ["示例"],
    },
    volumes: [
      {
        id: "v1",
        title: "卷一",
        order: 1,
        chapters: [
          { id: "v1-c001", title: "第一篇", volumeId: "v1", order: 1 },
          { id: "v1-c002", title: "第二篇", volumeId: "v1", order: 2 },
        ],
      },
      {
        id: "v2",
        title: "卷二",
        order: 2,
        chapters: [
          { id: "v2-c001", title: "第三篇", volumeId: "v2", order: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

const audit = {
  knownExceptions: [
    {
      kind: "title-only-empty-body",
      chapterIds: ["v1-c002"],
      resolution: "按原稿原样保留",
    },
  ],
};

function chapterContents(overrides = {}) {
  return {
    "v1-c001": "第一篇正文",
    "v1-c002": "",
    "v2-c001": "第三篇正文",
    ...overrides,
  };
}

describe("deriveBookBuild", () => {
  test("从 catalog 派生登记摘要、数量和篇章卷归属，并接受已登记的通用例外", () => {
    expect(deriveBookBuild({
      catalog: catalog(),
      audit,
      chapterContents: chapterContents(),
    })).toEqual({
      summary: {
        bookId: "sample",
        order: 2,
        title: "示例典籍",
        attribution: {
          name: "示例作者",
          role: "编",
        },
        description: "示例简介",
        volumeCount: 2,
        chapterCount: 3,
      },
      chapterVolumeMap: {
        "v1-c001": "v1",
        "v1-c002": "v1",
        "v2-c001": "v2",
      },
      allowedEmptyChapterIds: new Set(["v1-c002"]),
    });
  });

  test.each([
    ["重复卷 ID", () => {
      const value = catalog();
      value.volumes[1].id = "v1";
      return value;
    }, /sample.*重复卷 ID.*v1/],
    ["重复篇章 ID", () => {
      const value = catalog();
      value.volumes[1].chapters[0].id = "v1-c001";
      return value;
    }, /sample.*重复篇章 ID.*v1-c001/],
    ["卷顺序错误", () => {
      const value = catalog();
      value.volumes[1].order = 3;
      return value;
    }, /sample.*卷顺序.*v2/],
    ["篇章顺序错误", () => {
      const value = catalog();
      value.volumes[0].chapters[1].order = 3;
      return value;
    }, /sample.*篇章顺序.*v1-c002/],
  ])("%s 给出可定位诊断", (_name, makeCatalog, message) => {
    expect(() => deriveBookBuild({
      catalog: makeCatalog(),
      audit,
      chapterContents: chapterContents(),
    })).toThrow(message);
  });

  test("缺失正文、未登记空正文、未知例外和例外引用未知篇章均失败", () => {
    expect(() => deriveBookBuild({
      catalog: catalog(),
      audit,
      chapterContents: chapterContents({ "v2-c001": undefined }),
    })).toThrow(/sample.*v2-c001.*缺失正文/);
    expect(() => deriveBookBuild({
      catalog: catalog(),
      audit: { knownExceptions: [] },
      chapterContents: chapterContents(),
    })).toThrow(/sample.*v1-c002.*正文为空/);
    expect(() => deriveBookBuild({
      catalog: catalog(),
      audit: { knownExceptions: [{ kind: "mystery", chapterIds: ["v1-c001"] }] },
      chapterContents: chapterContents(),
    })).toThrow(/sample.*未知内容例外.*mystery/);
    expect(() => deriveBookBuild({
      catalog: catalog(),
      audit: {
        knownExceptions: [{
          kind: "title-only-empty-body",
          chapterIds: ["missing"],
        }],
      },
      chapterContents: chapterContents(),
    })).toThrow(/sample.*例外引用未知篇章.*missing/);
    expect(() => deriveBookBuild({
      catalog: catalog(),
      audit,
      chapterContents: chapterContents({ extra: "未登记正文" }),
    })).toThrow(/sample.*正文不在 catalog.*extra/);
  });

  test.each([
    [
      "title-only-empty-body 缺少篇章引用",
      { kind: "title-only-empty-body", chapterIds: [], resolution: "保留" },
      /title-only-empty-body.*缺少篇章引用/,
    ],
    [
      "title-only-empty-body 引用了非空正文",
      {
        kind: "title-only-empty-body",
        chapterIds: ["v1-c001"],
        resolution: "保留",
      },
      /title-only-empty-body.*v1-c001.*正文并非空白/,
    ],
    [
      "duplicate-title 引用的篇章标题不重复",
      {
        kind: "duplicate-title",
        chapterIds: ["v1-c001", "v1-c002"],
        resolution: "分别保留",
      },
      /duplicate-title.*篇章标题并不相同/,
    ],
    [
      "catalog-body-title-difference 与 catalog 不一致",
      {
        kind: "catalog-body-title-difference",
        chapterId: "v1-c001",
        catalogTitle: "目录题",
        bodyTitle: "错误正文题",
        resolution: "以正文题为准",
      },
      /catalog-body-title-difference.*bodyTitle.*第一篇/,
    ],
    [
      "inferred-title 与 catalog 不一致",
      {
        kind: "inferred-title",
        chapterId: "v1-c001",
        sourceTitle: "",
        catalogTitle: "错误推定题",
        resolution: "保留推定题",
      },
      /inferred-title.*catalogTitle.*第一篇/,
    ],
    [
      "已知例外缺少 resolution",
      {
        kind: "inferred-title",
        chapterId: "v1-c001",
        sourceTitle: "",
        catalogTitle: "第一篇",
      },
      /inferred-title.*缺少 resolution/,
    ],
  ])("%s 时失败", (_name, exception, message) => {
    expect(() => deriveBookBuild({
      catalog: catalog(),
      audit: { knownExceptions: [exception] },
      chapterContents: chapterContents(),
    })).toThrow(message);
  });
});

describe("renderGeneratedAdapters", () => {
  test("输出稳定、按展示顺序登记，并为每卷保留字面量 import", () => {
    const second = catalog();
    const first = catalog({
      book: { ...catalog().book, id: "first", order: 1, title: "第一部" },
      volumes: [catalog().volumes[0]],
    });
    const output = renderGeneratedAdapters([second, first]);

    expect(renderGeneratedAdapters([second, first])).toEqual(output);
    expect(output["src/books/registry.ts"].indexOf("first/catalog.json"))
      .toBeLessThan(output["src/books/registry.ts"].indexOf("sample/catalog.json"));
    expect(output["src/books/sample/definition.ts"]).toContain(
      'v1: () => import("./volumes/v1")',
    );
    expect(output["src/books/sample/definition.ts"]).toContain(
      'v2: () => import("./volumes/v2")',
    );
    expect(output["src/books/registry.ts"]).toContain("loadRuntime");
    expect(output["src/books/sample/definition.ts"]).toContain("createBookRuntime");
    expect(output["src/books/sample/definition.ts"]).not.toContain("createBookDefinition");
    expect(output["src/books/sample/volumes/v1.ts"]).toContain(
      'content/books/sample/chapters/v1/*.md',
    );
  });

  test("陈旧检查捕获新增、删除、改名或被修改的 generated adapter", () => {
    const onlyCatalog = catalog({
      book: { ...catalog().book, order: 1 },
    });
    const expected = renderGeneratedAdapters([onlyCatalog]);
    expect(findGeneratedAdapterDrift(expected, expected)).toEqual([]);
    expect(findGeneratedAdapterDrift(expected, {
      ...expected,
      "src/books/sample/volumes/v3.ts": "stale",
    })).toContain("多余：src/books/sample/volumes/v3.ts");

    const withoutV2 = { ...expected };
    delete withoutV2["src/books/sample/volumes/v2.ts"];
    expect(findGeneratedAdapterDrift(expected, withoutV2))
      .toContain("缺失：src/books/sample/volumes/v2.ts");

    expect(findGeneratedAdapterDrift(expected, {
      ...expected,
      "src/books/sample/definition.ts": "modified",
    })).toContain("内容陈旧：src/books/sample/definition.ts");
  });

  test("篇章新增、删除或改名会使所属卷 adapter 陈旧", () => {
    const baseCatalog = catalog({
      book: { ...catalog().book, order: 1 },
    });
    const actual = renderGeneratedAdapters([baseCatalog]);
    const changedCatalog = structuredClone(baseCatalog);
    changedCatalog.volumes[0].chapters[0].title = "改名后的第一篇";
    const renamed = renderGeneratedAdapters([changedCatalog]);
    expect(findGeneratedAdapterDrift(renamed, actual))
      .toContain("内容陈旧：src/books/sample/volumes/v1.ts");

    changedCatalog.volumes[0].chapters.push({
      id: "v1-c003",
      title: "新增篇",
      volumeId: "v1",
      order: 3,
    });
    const added = renderGeneratedAdapters([changedCatalog]);
    expect(findGeneratedAdapterDrift(added, actual))
      .toContain("内容陈旧：src/books/sample/volumes/v1.ts");

    changedCatalog.volumes[0].chapters.pop();
    changedCatalog.volumes[0].chapters.pop();
    const deleted = renderGeneratedAdapters([changedCatalog]);
    expect(findGeneratedAdapterDrift(deleted, actual))
      .toContain("内容陈旧：src/books/sample/volumes/v1.ts");
  });
});

describe("validateBuildArtifacts", () => {
  function build(overrides = {}) {
    return {
      books: [{
        bookId: "sample",
        catalog: catalog(),
        budgets: { volumeGzipBytes: 100, bookGzipBytes: 180 },
        volumeChunks: [
          {
            source: "src/books/sample/volumes/v1.ts",
            file: "assets/v1.js",
            gzipBytes: 80,
          },
          {
            source: "src/books/sample/volumes/v2.ts",
            file: "assets/v2.js",
            gzipBytes: 70,
          },
        ],
      }],
      outputs: {
        "assets/v1.js": [
          "../../../../content/books/sample/chapters/v1/v1-c001.md",
          "../../../../content/books/sample/chapters/v1/v1-c002.md",
        ].join("\n"),
        "assets/v2.js": "../../../../content/books/sample/chapters/v2/v2-c001.md",
      },
      ...overrides,
    };
  }

  test("接受逐卷独立且正文唯一归属的构建产物", () => {
    expect(validateBuildArtifacts(build())).toEqual({
      totalVolumeChunks: 2,
      books: [{ bookId: "sample", volumeChunks: 2, totalGzipBytes: 150 }],
    });
  });

  test("逐卷与全书 gzip 超限分别失败", () => {
    const volumeTooLarge = build();
    volumeTooLarge.books[0].volumeChunks[0].gzipBytes = 101;
    expect(() => validateBuildArtifacts(volumeTooLarge)).toThrow(/v1\.ts.*超过单卷 gzip 预算/);

    const bookTooLarge = build();
    bookTooLarge.books[0].budgets.bookGzipBytes = 149;
    expect(() => validateBuildArtifacts(bookTooLarge)).toThrow(/sample.*超过全书 gzip 预算/);
  });

  test("chunk 缺失、重复、跨书泄漏或正文进入错误卷时失败", () => {
    const missing = build();
    missing.books[0].volumeChunks.pop();
    expect(() => validateBuildArtifacts(missing)).toThrow(/sample.*正文 chunk 应为 2 个/);

    const duplicate = build();
    duplicate.books[0].volumeChunks[1].file = "assets/v1.js";
    expect(() => validateBuildArtifacts(duplicate)).toThrow(/sample.*每卷正文必须形成独立 chunk/);

    const leaked = build();
    leaked.outputs["assets/other.js"] =
      "../../../../content/books/sample/chapters/v1/v1-c001.md";
    expect(() => validateBuildArtifacts(leaked)).toThrow(/sample.*v1-c001.*正文归属异常/);

    const wrongVolume = build();
    wrongVolume.outputs["assets/v1.js"] = "";
    wrongVolume.outputs["assets/v2.js"] +=
      "\n../../../../content/books/sample/chapters/v1/v1-c001.md";
    expect(() => validateBuildArtifacts(wrongVolume)).toThrow(/sample.*v1-c001.*正文归属异常/);
  });
});
