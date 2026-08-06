import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;
const sha256 = (source: string) =>
  createHash("sha256").update(source).digest("hex");

interface SourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

interface Audit {
  sourceSnapshot: {
    path: string;
    sha256: string;
    bytes: number;
    lines: number;
  };
  inventory: {
    volumeCount: number;
    chapterCount: number;
    emptyChapterCount: number;
    volumes: Array<{ id: string; order: number; chapterCount: number }>;
  };
  knownExceptions: Array<{
    kind: string;
    chapterId: string;
    sourceTitle: string;
    catalogTitle: string;
  }>;
  warnings: Array<{
    kind: string;
    sourceTitle: string;
    chapterIds: string[];
    sourceRanges: SourceRange[];
  }>;
  structuralSegments: Array<{
    kind: string;
    attachedChapterId: string;
    source: SourceRange;
  }>;
  review: {
    independentReviewer: string | null;
    reviewedAt: string | null;
    conclusion: string;
  };
  chapters: Array<{
    chapterId: string;
    title: string;
    sourceTitle: string;
    source: SourceRange;
    outputPath: string;
    bytes: number;
    sha256: string;
  }>;
}

interface Catalog {
  book: {
    id: string;
    title: string;
    attribution: Array<{ name: string; role: string }>;
  };
  volumes: Array<{
    id: string;
    order: number;
    chapters: Array<{ id: string; title: string; volumeId: string; order: number }>;
  }>;
}

const audit = readJson<Audit>("content/books/wudenghuiyuan/audit.json");
const catalog = readJson<Catalog>("src/books/wudenghuiyuan/catalog.json");

describe("《五灯会元》内容包契约", () => {
  test("原稿快照与二十卷 1,739 篇库存固定", () => {
    const source = readFileSync(path.join(root, audit.sourceSnapshot.path), "utf8");
    expect({
      sha256: sha256(source),
      bytes: Buffer.byteLength(source),
      lines: source.split("\n").length - 1,
    }).toEqual({
      sha256: "8aa88b5af0bfe02bbb4af0f22ddc51bc509e05c9c0f1b348fd2e81fa537468fa",
      bytes: 2_358_741,
      lines: 32_221,
    });
    expect(audit.inventory).toMatchObject({
      volumeCount: 20,
      chapterCount: 1_739,
      emptyChapterCount: 0,
    });
    expect(audit.inventory.volumes.map((volume) => volume.chapterCount)).toEqual([
      40, 62, 72, 76, 44, 105, 46, 131, 45, 105,
      50, 98, 70, 123, 171, 137, 68, 118, 56, 122,
    ]);
  });

  test("catalog、稳定 ID、文件与逐篇摘要一一对应", () => {
    expect(catalog.book).toEqual({
      id: "wudenghuiyuan",
      order: 3,
      title: "五灯会元",
      attribution: [{ name: "（宋）释普济", role: "编" }],
      description: expect.any(String),
      sealLines: ["五灯", "会元"],
    });
    const catalogChapters = catalog.volumes.flatMap((volume) => volume.chapters);
    expect(catalog.volumes).toHaveLength(20);
    expect(catalogChapters).toHaveLength(1_739);
    expect(new Set(catalogChapters.map((chapter) => chapter.id)).size).toBe(1_739);
    expect(audit.chapters.map((chapter) => chapter.chapterId)).toEqual(
      catalogChapters.map((chapter) => chapter.id),
    );

    for (const [index, chapter] of audit.chapters.entries()) {
      const catalogChapter = catalogChapters[index]!;
      const body = readFileSync(path.join(root, chapter.outputPath), "utf8");
      expect(chapter.title).toBe(catalogChapter.title);
      expect(Buffer.byteLength(body), chapter.chapterId).toBe(chapter.bytes);
      expect(sha256(body), chapter.chapterId).toBe(chapter.sha256);
      expect(body.trim().length, chapter.chapterId).toBeGreaterThan(0);
      expect(chapter.source).toMatchObject({
        startLine: expect.any(Number),
        startColumn: expect.any(Number),
        endLine: expect.any(Number),
        endColumn: expect.any(Number),
      });
    }
  });

  test("推定标题、三组重名与结构段完整登记", () => {
    expect(audit.knownExceptions).toContainEqual(
      expect.objectContaining({
        kind: "inferred-title",
        chapterId: "v3-c001",
        sourceTitle: "",
        catalogTitle: "南岳怀让禅师",
      }),
    );
    expect(audit.warnings.map((warning) => ({
      kind: warning.kind,
      sourceTitle: warning.sourceTitle,
      chapterIds: warning.chapterIds,
    }))).toEqual([
      {
        kind: "duplicate-title",
        sourceTitle: "百丈惟政禅师",
        chapterIds: ["v3-c016", "v12-c032"],
      },
      {
        kind: "duplicate-title",
        sourceTitle: "福严文演禅师",
        chapterIds: ["v18-c010", "v19-c038"],
      },
      {
        kind: "duplicate-title",
        sourceTitle: "韶州林泉和尚",
        chapterIds: ["v7-c025", "v15-c029"],
      },
    ]);
    expect(audit.structuralSegments.filter((segment) => segment.kind === "volume-preface")).toHaveLength(20);
    expect(audit.structuralSegments.filter((segment) => segment.kind === "lineage-heading")).toHaveLength(399);
    expect(audit.structuralSegments.every((segment) =>
      audit.chapters.some((chapter) => chapter.chapterId === segment.attachedChapterId),
    )).toBe(true);
  });

  test("独立 agent 已签署全量复核", () => {
    expect(audit.review).toMatchObject({
      independentReviewer: "Codex independent content audit agent",
      reviewedAt: "2026-07-27",
      conclusion: "passed independent full review of all 1739 chapters",
    });
  });
});
