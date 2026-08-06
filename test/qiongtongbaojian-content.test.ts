import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;
const sha256 = (source: string | Buffer) =>
  createHash("sha256").update(source).digest("hex");

interface SourceRange {
  startLine: number;
  endLine: number;
  startByte: number;
  endByte: number;
}

interface Audit {
  sourceSnapshot: {
    path: string;
    sha256: string;
    bytes: number;
    lines: number;
  };
  inventory: {
    headingCount: number;
    candidateCount: number;
    chapterCount: number;
    headingLevels: Record<string, number>;
    volumeCount: number;
    volumes: Array<{ id: string; order: number; chapterCount: number }>;
  };
  frontMatter: {
    kind: string;
    source: SourceRange;
    sha256: string;
    catalogMapping: {
      title: string;
      attributions: Array<{ name: string; role: string }>;
      versionMarker: string;
    };
  };
  chapters: Array<{
    chapterId: string;
    title: string;
    headingLevel: number;
    source: SourceRange;
    outputPath: string;
    bytes: number;
    sha256: string;
  }>;
  structuralSegments: Array<{
    kind: string;
    title?: string;
    source: SourceRange;
    attachedChapterId?: string;
    resolution: string;
  }>;
  headingLevelJumps: Array<{
    fromLine: number;
    toLine: number;
    fromLevel: number;
    toLevel: number;
  }>;
  plainTextLabels: Array<{
    kind: string;
    text: string;
    sourceLine: number;
    chapterId: string;
  }>;
  mergedMonthHeadings: Array<{
    title: string;
    months: string[];
    chapterId: string;
  }>;
  monthCoverage: Array<{
    tiangan: string;
    month: number;
    chapterId: string;
    source: SourceRange;
  }>;
  contentBlocks: {
    exampleTables: { count: number; ranges: SourceRange[] };
    commentary: { count: number; ranges: SourceRange[] };
    crossScopeCommentary: Array<{
      source: SourceRange;
      chapterId: string;
      resolution: string;
    }>;
  };
  review: {
    independentReviewer: string;
    reviewedAt: string;
    conclusion: string;
    checks: Record<string, number | boolean | string>;
  };
}

interface Catalog {
  book: {
    id: string;
    order: number;
    title: string;
    attribution: Array<{ name: string; role: string }>;
    description: string;
    sealLines: string[];
  };
  volumes: Array<{
    id: string;
    title: string;
    order: number;
    chapters: Array<{
      id: string;
      title: string;
      volumeId: string;
      order: number;
    }>;
  }>;
}

const audit = readJson<Audit>("content/books/qiongtongbaojian/audit.json");
const catalog = readJson<Catalog>("src/books/qiongtongbaojian/catalog.json");

describe("《穷通宝鉴》内容包契约", () => {
  test("固定原稿快照、heading 库存与单卷 108 篇身份", () => {
    const source = readFileSync(path.join(root, audit.sourceSnapshot.path));

    expect({
      sha256: sha256(source),
      bytes: source.byteLength,
      lines: source.toString("utf8").split("\n").length - 1,
    }).toEqual({
      sha256: "148c4cb70072d465162a0668864c623f08896065b9b1c1ec1f7aec78b30a5483",
      bytes: 125_795,
      lines: 1_889,
    });
    expect(audit.inventory).toEqual({
      headingCount: 112,
      candidateCount: 111,
      chapterCount: 108,
      headingLevels: { h1: 1, h2: 13, h3: 22, h4: 76 },
      volumeCount: 1,
      volumes: [{ id: "v1", order: 1, chapterCount: 108 }],
    });
    expect(catalog.volumes).toHaveLength(1);
    expect(catalog.volumes[0]?.chapters).toHaveLength(108);
    expect(catalog.volumes[0]?.chapters[0]).toMatchObject({
      id: "v1-c001",
      title: "序言",
      order: 1,
    });
    expect(catalog.volumes[0]?.chapters[1]).toMatchObject({
      id: "v1-c002",
      title: "五行总论",
      order: 2,
    });
    expect(catalog.volumes[0]?.chapters.at(-1)).toMatchObject({
      id: "v1-c108",
      title: "十二月癸水",
      order: 108,
    });
  });

  test("书目身份忠实映射 front matter 与有序多责任者", () => {
    expect(catalog.book).toEqual({
      id: "qiongtongbaojian",
      order: 5,
      title: "穷通宝鉴",
      attribution: [
        { name: "（清）余春台", role: "辑" },
        { name: "徐乐吾", role: "评注" },
      ],
      description:
        "余春台辑、徐乐吾评注本，按十天干与四时月份查阅调候取用论述、评注及命例。",
      sealLines: ["穷通", "宝鉴"],
    });
    expect(audit.frontMatter).toMatchObject({
      kind: "source-front-matter",
      catalogMapping: {
        title: "穷通宝鉴",
        attributions: [
          { name: "（清）余春台", role: "辑" },
          { name: "徐乐吾", role: "评注" },
        ],
        versionMarker: "徐乐吾评注版",
      },
    });
  });

  test("三个空 heading 只作为后继篇章的结构前缀", () => {
    expect(
      audit.structuralSegments
        .filter((segment) => segment.kind === "structural-prefix")
        .map(({ title, source, attachedChapterId }) => ({
          title,
          startLine: source.startLine,
          endLine: source.endLine,
          attachedChapterId,
        })),
    ).toEqual([
      {
        title: "三夏丁火",
        startLine: 618,
        endLine: 619,
        attachedChapterId: "v1-c034",
      },
      {
        title: "三秋丁火",
        startLine: 688,
        endLine: 689,
        attachedChapterId: "v1-c037",
      },
      {
        title: "三冬丁火",
        startLine: 739,
        endLine: 740,
        attachedChapterId: "v1-c039",
      },
    ]);
    expect(audit.chapters.map((chapter) => chapter.title)).not.toEqual(
      expect.arrayContaining(["三夏丁火", "三秋丁火", "三冬丁火"]),
    );
  });

  test("逐篇文件、catalog 与 source range 双向一致并逐字重建原稿", () => {
    const source = readFileSync(path.join(root, audit.sourceSnapshot.path));
    const ownedParts = [
      source.subarray(
        audit.frontMatter.source.startByte - 1,
        audit.frontMatter.source.endByte,
      ),
    ];

    for (const [index, chapter] of audit.chapters.entries()) {
      const body = readFileSync(path.join(root, chapter.outputPath));
      const sourceSlice = source.subarray(
        chapter.source.startByte - 1,
        chapter.source.endByte,
      );
      expect(body, chapter.chapterId).toEqual(sourceSlice);
      expect(body.byteLength, chapter.chapterId).toBe(chapter.bytes);
      expect(sha256(body), chapter.chapterId).toBe(chapter.sha256);
      expect(catalog.volumes[0]?.chapters[index]).toEqual({
        id: chapter.chapterId,
        title: chapter.title,
        volumeId: "v1",
        order: index + 1,
      });
      ownedParts.push(body);
    }

    const reconstructed = Buffer.concat(ownedParts);
    expect(reconstructed).toEqual(source);
    expect(sha256(reconstructed)).toBe(audit.sourceSnapshot.sha256);
  });

  test("结构异常、月份覆盖、命例表与评注计数全部闭合", () => {
    expect(audit.headingLevelJumps).toEqual([
      { fromLine: 1006, toLine: 1017, fromLevel: 2, toLevel: 4 },
      { fromLine: 1122, toLine: 1149, fromLevel: 2, toLevel: 4 },
      { fromLine: 1325, toLine: 1338, fromLevel: 2, toLevel: 4 },
      { fromLine: 1534, toLine: 1548, fromLevel: 2, toLevel: 4 },
      { fromLine: 1717, toLine: 1727, fromLevel: 2, toLevel: 4 },
    ]);
    expect(audit.monthCoverage).toHaveLength(120);
    expect(
      new Set(
        audit.monthCoverage.map(({ tiangan, month }) => `${tiangan}-${month}`),
      ).size,
    ).toBe(120);
    expect(audit.contentBlocks.exampleTables).toMatchObject({ count: 188 });
    expect(audit.contentBlocks.exampleTables.ranges).toHaveLength(188);
    expect(audit.contentBlocks.commentary).toMatchObject({ count: 28 });
    expect(audit.contentBlocks.commentary.ranges).toHaveLength(28);
    const crossScopeCommentary =
      audit.contentBlocks.crossScopeCommentary.map((entry) => ({
        lines: [entry.source.startLine, entry.source.endLine],
        chapterId: entry.chapterId,
      }));
    expect(crossScopeCommentary).toEqual([
      { lines: [360, 362], chapterId: "v1-c019" },
      { lines: [552, 556], chapterId: "v1-c029" },
      { lines: [611, 615], chapterId: "v1-c033" },
      { lines: [681, 685], chapterId: "v1-c036" },
      { lines: [734, 736], chapterId: "v1-c038" },
      { lines: [786, 788], chapterId: "v1-c040" },
      { lines: [1051, 1057], chapterId: "v1-c056" },
      { lines: [1320, 1322], chapterId: "v1-c071" },
      { lines: [1507, 1513], chapterId: "v1-c083" },
      { lines: [1708, 1714], chapterId: "v1-c096" },
      { lines: [1880, 1888], chapterId: "v1-c108" },
    ]);
    for (const entry of audit.contentBlocks.crossScopeCommentary) {
      expect(audit.contentBlocks.commentary.ranges).toContainEqual(entry.source);
      const owner = audit.chapters.find(
        (chapter) => chapter.chapterId === entry.chapterId,
      );
      expect(owner?.source.startLine).toBeLessThanOrEqual(entry.source.startLine);
      expect(owner?.source.endLine).toBeGreaterThanOrEqual(entry.source.endLine);
    }
  });

  test("独立 agent 已签署全量复核且所有异常计数为零", () => {
    expect(audit.review).toMatchObject({
      independentReviewer: "Codex independent content audit agent",
      reviewedAt: "2026-07-29",
      conclusion: "passed independent full review of all 108 chapters",
      checks: {
        chaptersReviewed: 108,
        monthPositionsReviewed: 120,
        exampleTablesReviewed: 188,
        commentaryBlocksReviewed: 28,
        crossScopeCommentary: 11,
        nonCrossScopeCommentary: 17,
        omissions: 0,
        duplications: 0,
        orderingErrors: 0,
        silentRewrites: 0,
        unknownAnomalies: 0,
      },
    });
  });

  test("重复导入相同内容时保留独立复核签署", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "qiongtongbaojian-"));
    const tempSourceDir = path.join(
      tempRoot,
      "content/books/qiongtongbaojian",
    );
    const tempAuditPath = path.join(tempSourceDir, "audit.json");

    try {
      mkdirSync(tempSourceDir, { recursive: true });
      copyFileSync(
        path.join(root, audit.sourceSnapshot.path),
        path.join(tempSourceDir, "source.md"),
      );
      execFileSync(
        process.execPath,
        [path.join(root, "scripts/import-qiongtongbaojian.mjs")],
        { cwd: tempRoot },
      );
      const generatedAudit = readJson<Audit>(
        path.relative(root, tempAuditPath),
      );
      generatedAudit.review = audit.review;
      writeFileSync(tempAuditPath, `${JSON.stringify(generatedAudit, null, 2)}\n`);

      execFileSync(
        process.execPath,
        [path.join(root, "scripts/import-qiongtongbaojian.mjs")],
        { cwd: tempRoot },
      );

      expect(
        JSON.parse(readFileSync(tempAuditPath, "utf8")).review,
      ).toEqual(audit.review);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
