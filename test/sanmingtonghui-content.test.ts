import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;
const sha256 = (source: string) =>
  createHash("sha256").update(source).digest("hex");

interface Audit {
  sourceSnapshot: {
    path: string;
    sha256: string;
    bytes: number;
  };
  inventory: {
    volumeCount: number;
    chapterCount: number;
    volumes: Array<{ id: string; order: number; chapterCount: number }>;
  };
  chapters: Array<{
    chapterId: string;
    title: string;
    source: { startLine: number; endLine: number };
    outputPath: string;
    sha256: string;
  }>;
  warnings: Array<{
    kind: string;
    chapterId: string;
    catalogTitle: string;
    bodyTitle: string;
  }>;
  knownExceptions: Array<{
    kind: string;
    chapterIds: string[];
  }>;
  review: {
    importedAt: string;
    importer: string;
    verificationCommit: string;
    independentReviewer: string;
    reviewedAt: string;
    conclusion: string;
  };
}

interface Catalog {
  volumes: Array<{
    id: string;
    chapters: Array<{ id: string; title: string; order: number }>;
  }>;
}

const audit = readJson<Audit>("content/books/sanmingtonghui/audit.json");
const catalog = readJson<Catalog>("src/books/sanmingtonghui/catalog.json");

describe("《三命通会》校定内容包契约", () => {
  test("新版快照与十二卷 370 篇库存固定", () => {
    const source = readFileSync(path.join(root, audit.sourceSnapshot.path), "utf8");

    expect({
      sha256: sha256(source),
      bytes: Buffer.byteLength(source),
    }).toEqual({
      sha256: "e5a45cd30e97920948b08db01de0fde9c96dc4647391bad18fa69c1a4fcdace8",
      bytes: 869_215,
    });
    expect(audit.inventory).toMatchObject({
      volumeCount: 12,
      chapterCount: 370,
    });
    expect(audit.inventory.volumes.map(({ chapterCount }) => chapterCount)).toEqual([
      36, 26, 23, 25, 20, 73, 22, 60, 60, 3, 5, 17,
    ]);
  });

  test("catalog、稳定 ID、源行范围与逐篇文件一一对应", () => {
    const sourceLines = readFileSync(
      path.join(root, audit.sourceSnapshot.path),
      "utf8",
    ).split("\n");
    const catalogChapters = catalog.volumes.flatMap((volume) => volume.chapters);

    expect(catalogChapters).toHaveLength(370);
    expect(new Set(catalogChapters.map(({ id }) => id)).size).toBe(370);
    expect(audit.chapters.map(({ chapterId }) => chapterId)).toEqual(
      catalogChapters.map(({ id }) => id),
    );

    for (const [index, chapter] of audit.chapters.entries()) {
      const catalogChapter = catalogChapters[index]!;
      const body = readFileSync(path.join(root, chapter.outputPath), "utf8");
      const sourceBody = sourceLines
        .slice(chapter.source.startLine, chapter.source.endLine)
        .join("\n");

      expect(chapter.title, chapter.chapterId).toBe(catalogChapter.title);
      expect(sha256(body), chapter.chapterId).toBe(chapter.sha256);
      expect(body, chapter.chapterId).toBe(sourceBody);
    }
  });

  test("新增边界、标题校正与原有例外均明确登记", () => {
    const chapterById = new Map(
      catalog.volumes.flatMap((volume) =>
        volume.chapters.map((chapter) => [chapter.id, chapter] as const)
      ),
    );

    expect(chapterById.get("v1-c015")?.title).toBe("甲辰乙巳覆灯火");
    expect(chapterById.get("v1-c026")?.title).toBe("戊寅己卯城头土");
    expect(["v12-c014", "v12-c015", "v12-c016", "v12-c017"].map((id) =>
      chapterById.get(id)?.title
    )).toEqual(["造微论", "精微论", "四言独步", "五言独步"]);
    expect(audit.warnings).toContainEqual(expect.objectContaining({
      kind: "catalog-body-title-difference",
      chapterId: "v11-c004",
      catalogTitle: "消息赋",
      bodyTitle: "消息赋(育吾子解)",
    }));
    expect(audit.knownExceptions).toContainEqual({
      kind: "title-only-empty-body",
      chapterIds: ["v4-c001", "v4-c007"],
      resolution: "按原稿原样保留",
    });
  });

  test("独立 agent 已签署新版全量复核", () => {
    expect(audit.review).toEqual({
      importedAt: "2026-07-27",
      importer: "Codex primary agent",
      verificationCommit: "50db204f97f6f21a076e0ba0e649a4773fed26e0",
      independentReviewer: "Codex independent spec review agent",
      reviewedAt: "2026-07-27",
      conclusion: "passed independent full review of all 370 chapters",
    });
  });
});
