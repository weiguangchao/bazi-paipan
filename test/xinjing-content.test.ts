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
    lines: number;
  };
  inventory: {
    volumeCount: number;
    chapterCount: number;
    volumes: Array<{ id: string; order: number; chapterCount: number }>;
  };
  volumeMapping: {
    volumeId: string;
    title: string;
    sourceTitle: string;
    resolution: string;
  };
  chapters: Array<{
    chapterId: string;
    title: string;
    source: { startLine: number; endLine: number };
    outputPath: string;
    bytes: number;
    sha256: string;
  }>;
  structuralSegments: Array<{
    kind: string;
    source: { startLine: number; endLine: number };
    resolution: string;
  }>;
  review: {
    independentReviewer: string;
    reviewedAt: string;
    conclusion: string;
  };
}

interface Catalog {
  book: {
    id: string;
    title: string;
    attribution: { name: string; role: string };
  };
  volumes: Array<{
    id: string;
    title: string;
    chapters: Array<{ id: string; title: string; order: number }>;
  }>;
}

const audit = readJson<Audit>("content/books/xinjing/audit.json");
const catalog = readJson<Catalog>("src/books/xinjing/catalog.json");

describe("《心经》内容包契约", () => {
  test("固定原稿快照与一卷一篇库存", () => {
    const source = readFileSync(path.join(root, audit.sourceSnapshot.path), "utf8");

    expect({
      sha256: sha256(source),
      bytes: Buffer.byteLength(source),
      lines: source.split("\n").length - 1,
    }).toEqual({
      sha256: "26095c8a7d0ec2268908c01654ec1119d543cb840f665d9499fc5abafcf33b5e",
      bytes: 1_133,
      lines: 19,
    });
    expect(audit.inventory).toEqual({
      volumeCount: 1,
      chapterCount: 1,
      volumes: [{ id: "v1", order: 1, chapterCount: 1 }],
    });
  });

  test("全卷映射、译者署名与正文篇章保持已确认身份", () => {
    expect(catalog.book).toMatchObject({
      id: "xinjing",
      title: "般若波罗蜜多心经",
      attribution: {
        name: "唐三藏法师玄奘",
        role: "译",
      },
    });
    expect(catalog.volumes).toEqual([
      {
        id: "v1",
        title: "全卷",
        order: 1,
        chapters: [
          {
            id: "v1-c001",
            title: "正文",
            volumeId: "v1",
            order: 1,
          },
        ],
      },
    ]);
    expect(audit.volumeMapping).toEqual({
      volumeId: "v1",
      title: "全卷",
      sourceTitle: "",
      resolution: "原稿无显式卷次，以一个代表全书的阅读单元承载正文",
    });
  });

  test("正文逐字取自原稿第 13 至 16 行，头尾结构段无遗漏", () => {
    const sourceLines = readFileSync(
      path.join(root, audit.sourceSnapshot.path),
      "utf8",
    ).split("\n");
    const chapter = audit.chapters[0]!;
    const body = readFileSync(path.join(root, chapter.outputPath), "utf8");
    const sourceBody = sourceLines
      .slice(chapter.source.startLine - 1, chapter.source.endLine)
      .join("\n");

    expect(chapter).toMatchObject({
      chapterId: "v1-c001",
      title: "正文",
      source: { startLine: 13, endLine: 16 },
      bytes: 939,
      sha256: "147c0d71ca94e13929190c3ab8ba9be41a794a0d1c6662a164cf97028945320e",
    });
    expect(body).toBe(sourceBody);
    expect(Buffer.byteLength(body)).toBe(chapter.bytes);
    expect(sha256(body)).toBe(chapter.sha256);
    expect(audit.structuralSegments).toEqual([
      {
        kind: "source-front-matter",
        source: { startLine: 1, endLine: 12 },
        resolution: "书名、目录元数据、分隔线与正文标题不进入篇章正文",
      },
      {
        kind: "source-closing",
        source: { startLine: 17, endLine: 19 },
        resolution: "正文后分隔线与重复书名不进入篇章正文",
      },
    ]);
  });

  test("独立 agent 已签署全量复核", () => {
    expect(audit.review).toMatchObject({
      independentReviewer: "Codex independent spec review agent",
      reviewedAt: "2026-07-28",
      conclusion: "passed independent full review of the single chapter",
    });
  });
});
