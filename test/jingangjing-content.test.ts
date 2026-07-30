import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const sha256 = (source: Buffer | string) =>
  createHash("sha256").update(source).digest("hex");
const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;

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
    codePoints: number;
  };
  inventory: Record<string, unknown>;
  chapters: Array<{
    chapterId: string;
    title: string;
    order: number;
    source: SourceRange;
    outputPath: string;
    rawBytes: number;
    bodyBytes: number;
    sha256: string;
  }>;
  structuralSegments: Array<{
    kind: string;
    purpose: string;
    source: SourceRange;
    sha256: string;
    rawBytes: number;
  }>;
  ownershipClosure: Record<string, number | string>;
  sourceAnomalies: Record<string, number | number[]>;
  review: {
    status: string;
    verificationCommit?: string;
    reviewedAt?: string;
    independentReviewer?: string;
    conclusion?: string;
    checks: Record<string, number>;
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

const expectedChapterSlices = [
  ["v1-c001", "开经偈", 3, 7, 29, 135, 107, 94, "49fa712bd88bad7f644284f1e1530d87633586262936ecc1a735bcb09b900eba"],
  ["v1-c002", "法会因由分第一", 14, 17, 181, 466, 286, 261, "fc0972ba5ef33d2b74be805a5cce2feecc9af45206087c09cb908bc79833f502"],
  ["v1-c003", "善现启请分第二", 18, 23, 467, 1051, 585, 560, "6c1664885ab6a9711b1f5ac2d786ea58744668a492e672163a9343ac372d10d8"],
  ["v1-c004", "大乘正宗分第三", 24, 27, 1052, 1490, 439, 414, "9f6818062846804aa1855502a240acfff8bdb3c0bd816f40b2474c7fc2d1b053"],
  ["v1-c005", "妙行无住分第四", 28, 31, 1491, 2037, 547, 522, "d961dd38eb7e1f49064503c6ccab4e59b4275614fde2161893abd7310bf04794"],
  ["v1-c006", "如理实见分第五", 32, 35, 2038, 2317, 280, 255, "136ea828ef0b54762cdc150fd42996a40fe9126f19690ada33fbb75691c9e09d"],
  ["v1-c007", "正信希有分第六", 36, 39, 2318, 3224, 907, 882, "65110828ccf5bf20ad681016faf988720af3e47ef71cbab96ae01a9392755d89"],
  ["v1-c008", "无得无说分第七", 40, 43, 3225, 3612, 388, 363, "916860f5b97089a3ab31251437af51c0d7fb3ded055ffd7ad8865ef7fd128263"],
  ["v1-c009", "依法出生分第八", 44, 47, 3613, 4099, 487, 462, "2b4f4400e2e047dc62835195a768d393434b6052eec12e8503ecf736e8c8e27f"],
  ["v1-c010", "一相无相分第九", 48, 51, 4100, 5318, 1219, 1194, "0d5ee8a829f555e4b1ef9aed3004d726ddcb7a9ecaf41f460e97ddb5ac786405"],
  ["v1-c011", "庄严净土分第十", 52, 55, 5319, 5973, 655, 630, "bb73501a604f9c965bdefcf429be148b8e517830ef63d213a1db6906fc03ff2c"],
  ["v1-c012", "无为福胜分第十一", 56, 59, 5974, 6529, 556, 528, "44ac37209b26ff3c7b793bbebaf138e1b954e327dce449a8913a731997e7fd29"],
  ["v1-c013", "尊重正教分第十二", 60, 63, 6530, 6857, 328, 300, "8d73c49a65961bf0245ca23ae393f1a69f22d3dfa7dd54203f67cb7848c866a8"],
  ["v1-c014", "如法受持分第十三", 64, 67, 6858, 7830, 973, 945, "bdcb451d45e4af8c037eb16f72f05673729258a0bc3c19751ee4561b5ac2a33f"],
  ["v1-c015", "离相寂灭分第十四", 68, 71, 7831, 10054, 2224, 2196, "5dea5ee9c95c55f7fc448085e82271f2075e05391e8827fff1c6ac90f3b492ad"],
  ["v1-c016", "持经功德分第十五", 72, 75, 10055, 11060, 1006, 978, "48b7d0cbab4fe4ec5c7bdc3ab34cca5a36f321f616d0d8d3730960ad8cd435c9"],
  ["v1-c017", "能净业障分第十六", 76, 79, 11061, 11832, 772, 744, "1cbe49d5e34f373b687c063ae954e45fb1ab6cf35e4fac03cc793b1487bc4b99"],
  ["v1-c018", "究竟无我分第十七", 80, 83, 11833, 13873, 2041, 2013, "02dc7c160df6919b34c231f28ffce2f3719cc294d354b3e2548501bafa0c1e12"],
  ["v1-c019", "一体同观分第十八", 84, 87, 13874, 14903, 1030, 1002, "22c82961b2184bf8ae4921d89fc151b3392c5488cc9d0106ad6a35a692e2c854"],
  ["v1-c020", "法界通化分第十九", 88, 91, 14904, 15222, 319, 291, "4a637c9f7f9e35cae4cdbe542de0a9ddfa8804f1df0382965aeb19fbe19c3b22"],
  ["v1-c021", "离色离相分第二十", 92, 95, 15223, 15646, 424, 396, "677f79feb9590de16c9fbac3042718a5203f65856c1a96ea441c942690d8d820"],
  ["v1-c022", "非说所说分第二十一", 96, 99, 15647, 16151, 505, 474, "d9a91e116babfc10531b38c2644d9132c2c4151808dc5aea0821624e11129bb9"],
  ["v1-c023", "无法可得分第二十二", 100, 103, 16152, 16419, 268, 237, "0edb8f66d1006d730e60decae83c51723b33dc44112b2376dbcd4618a170210d"],
  ["v1-c024", "净心行善分第二十三", 104, 107, 16420, 16711, 292, 261, "2afd2e8692906846c7102972b4657b0a0b97250bcfeb5f0e0243217443f9b10d"],
  ["v1-c025", "福智无比分第二十四", 108, 111, 16712, 17018, 307, 276, "eff6c07b18864f4dce90fede851b2458763a3a7e0c6efb23af683e77e93c38de"],
  ["v1-c026", "化无所化分第二十五", 112, 115, 17019, 17427, 409, 378, "4a29a3bb6d380bd6fbc385f10fd17044e7073efedddb4f816ceeb76c2da2141a"],
  ["v1-c027", "法身非相分第二十六", 116, 121, 17428, 17883, 456, 425, "e0a7e30d7346eb96362449d364ff1270e78783aae0fd8348f618f0ce3c66f571"],
  ["v1-c028", "无断无灭分第二十七", 122, 125, 17884, 18283, 400, 369, "373de507426651e43573f55822a3112567018a9b9b00de6f45d8438ed996c43e"],
  ["v1-c029", "不受不贪分第二十八", 126, 129, 18284, 18653, 370, 339, "45a6c15261d94eceda6c7e366700b10f208205c675322d8708b2c2a9038735d1"],
  ["v1-c030", "威仪寂静分第二十九", 130, 133, 18654, 18852, 199, 168, "d3aa21d548ca323f9fb2d8cc39431e97c5eb0c2fbb0eeb35f19e685530483ea9"],
  ["v1-c031", "一合理相分第三十", 134, 137, 18853, 19438, 586, 558, "e25b17c520556627efd49e7e566841a2479ea1eba9d7d85409816cbdc8e68733"],
  ["v1-c032", "知见不生分第三十一", 138, 141, 19439, 19991, 553, 522, "aa596155f0df80a1ecf5548f1d0917161eb2081bf3b0657f3a866d91a6232b67"],
  ["v1-c033", "应化非真分第三十二", 142, 148, 19992, 20541, 550, 519, "9018ecd6e9f5d5a3af669c766b1b845c201b0ee3b8edb7f40db85971503a4042"],
] as const;

const audit = readJson<Audit>("content/books/jingangjing/audit.json");
const catalog = readJson<Catalog>("src/books/jingangjing/catalog.json");

describe("《金刚般若波罗蜜经》内容包契约", () => {
  test("仓库快照保持已确认的原稿指纹", () => {
    const source = readFileSync(
      path.join(root, "content/books/jingangjing/source.md"),
    );
    const text = source.toString("utf8");

    expect({
      sha256: sha256(source),
      bytes: source.byteLength,
      lines: text.split("\n").length - 1,
      codePoints: [...text].length,
      endsWithLf: source.at(-1) === 0x0a,
    }).toEqual({
      sha256: "9f4ea469eacb17536dd4948f3aeaa70e65e67da8c0b7bd307495f988aab8762a",
      bytes: 20_541,
      lines: 148,
      codePoints: 7_017,
      endsWithLf: true,
    });
  });

  test("固定单卷 33 篇书目身份与稳定顺序", () => {
    expect(catalog.book).toEqual({
      id: "jingangjing",
      order: 6,
      title: "金刚般若波罗蜜经",
      attribution: [{ name: "姚秦三藏法师鸠摩罗什", role: "译" }],
      description:
        "姚秦三藏法师鸠摩罗什译本，以全卷三十三篇阅读开经偈与三十二分经文正文。",
      sealLines: ["金刚", "经"],
    });
    expect(audit.inventory).toEqual({
      headingCount: 34,
      headingLevels: { h1: 1, h2: 33 },
      chapterCount: 33,
      structuralSegmentCount: 2,
      volumeCount: 1,
      volumes: [{ id: "v1", order: 1, chapterCount: 33 }],
    });
    expect(catalog.volumes).toEqual([
      {
        id: "v1",
        title: "全卷",
        order: 1,
        chapters: expectedChapterSlices.map(([id, title], index) => ({
          id,
          title,
          volumeId: "v1",
          order: index + 1,
        })),
      },
    ]);
  });

  test("全部篇章范围、bytes 与 SHA 保持独立研究基线", () => {
    expect(
      audit.chapters.map((chapter) => [
        chapter.chapterId,
        chapter.title,
        chapter.source.startLine,
        chapter.source.endLine,
        chapter.source.startByte,
        chapter.source.endByte,
        chapter.rawBytes,
        chapter.bodyBytes,
        chapter.sha256,
      ]),
    ).toEqual(expectedChapterSlices);
  });

  test("两个结构段、U+3000 与 byte 唯一所有权闭合", () => {
    expect(
      audit.structuralSegments.map((segment) => ({
        kind: segment.kind,
        purpose: segment.purpose,
        source: segment.source,
        rawBytes: segment.rawBytes,
        sha256: segment.sha256,
      })),
    ).toEqual([
      {
        kind: "source-front-matter",
        purpose: "title",
        source: { startLine: 1, endLine: 2, startByte: 1, endByte: 28 },
        rawBytes: 28,
        sha256: "53da8afaa4acf99253e1070d0f552ae4818577922d3b0c205d70fd8ddd474613",
      },
      {
        kind: "source-front-matter",
        purpose: "attribution",
        source: { startLine: 8, endLine: 13, startByte: 136, endByte: 180 },
        rawBytes: 45,
        sha256: "b08a443a1d280c44174c95f59bd0af1298573f4b52f89b0b5e98f1a3ec349e58",
      },
    ]);
    expect(audit.ownershipClosure).toEqual({
      chapterBytes: 20_468,
      structuralBytes: 73,
      totalBytes: 20_541,
      unownedBytes: 0,
      uniquelyOwnedBytes: 20_541,
      duplicatedBytes: 0,
      reconstructionSha256:
        "9f4ea469eacb17536dd4948f3aeaa70e65e67da8c0b7bd307495f988aab8762a",
    });
    expect(audit.sourceAnomalies).toMatchObject({ u3000Lines: [5, 6] });
    const first = readFileSync(path.join(root, audit.chapters[0]!.outputPath), "utf8");
    expect(first.match(/\u3000/g)).toHaveLength(2);
  });

  test("catalog、篇章文件与审计正反向一致并逐 byte 重建原稿", () => {
    const source = readFileSync(path.join(root, audit.sourceSnapshot.path));
    const slice = (range: SourceRange) =>
      source.subarray(range.startByte - 1, range.endByte);
    const catalogChapters = catalog.volumes[0]!.chapters;

    for (const [index, chapter] of audit.chapters.entries()) {
      const file = readFileSync(path.join(root, chapter.outputPath));
      expect(file, chapter.chapterId).toEqual(slice(chapter.source));
      expect(file.byteLength, chapter.chapterId).toBe(chapter.rawBytes);
      expect(sha256(file), chapter.chapterId).toBe(chapter.sha256);
      expect(catalogChapters[index]).toMatchObject({
        id: chapter.chapterId,
        title: chapter.title,
        order: index + 1,
      });
    }

    const reconstructed = Buffer.concat([
      slice(audit.structuralSegments[0]!.source),
      slice(audit.chapters[0]!.source),
      slice(audit.structuralSegments[1]!.source),
      ...audit.chapters.slice(1).map((chapter) => slice(chapter.source)),
    ]);
    expect(reconstructed).toEqual(source);
  });

  test("独立 agent 已签署 33 篇与 2 个结构段的全量复核", () => {
    expect(audit.review).toMatchObject({
      status: "passed",
      checks: {
        chaptersReviewed: 33,
        structuralSegmentsReviewed: 2,
        omissions: 0,
        duplications: 0,
        orderingErrors: 0,
        silentRewrites: 0,
        unknownAnomalies: 0,
      },
    });
    expect(audit.review.verificationCommit).toMatch(/^[0-9a-f]{7,40}$/);
    expect(audit.review.independentReviewer).toBeTruthy();
    expect(audit.review.reviewedAt).toBe("2026-07-30");
    expect(audit.review.conclusion).toBeTruthy();
  });

  test("importer 可确定重放，且仅在生成事实未变时保留独立签署", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "jingangjing-"));
    const tempSource = path.join(tempRoot, "content/books/jingangjing/source.md");
    mkdirSync(path.dirname(tempSource), { recursive: true });
    copyFileSync(
      path.join(root, "content/books/jingangjing/source.md"),
      tempSource,
    );
    const importer = path.join(root, "scripts/import-jingangjing.mjs");
    const run = () =>
      execFileSync(process.execPath, [importer], {
        cwd: tempRoot,
        encoding: "utf8",
        stdio: "pipe",
      });
    const generatedFiles = () =>
      [
        path.join(tempRoot, "content/books/jingangjing/audit.json"),
        path.join(tempRoot, "src/books/jingangjing/catalog.json"),
        ...readdirSync(
          path.join(tempRoot, "content/books/jingangjing/chapters/v1"),
        ).map((file) =>
          path.join(tempRoot, "content/books/jingangjing/chapters/v1", file)
        ),
      ].map((file) => [path.relative(tempRoot, file), sha256(readFileSync(file))]);

    try {
      run();
      const first = generatedFiles();
      run();
      expect(generatedFiles()).toEqual(first);

      const generatedAuditPath =
        path.join(tempRoot, "content/books/jingangjing/audit.json");
      const generatedAudit = JSON.parse(
        readFileSync(generatedAuditPath, "utf8"),
      ) as Audit;
      generatedAudit.review = {
        status: "passed",
        verificationCommit: "1234567",
        reviewedAt: "2026-07-30",
        independentReviewer: "independent fixture",
        conclusion: "fixture passed",
        checks: {
          chaptersReviewed: 33,
          structuralSegmentsReviewed: 2,
          omissions: 0,
          duplications: 0,
          orderingErrors: 0,
          silentRewrites: 0,
          unknownAnomalies: 0,
        },
      };
      writeFileSync(
        generatedAuditPath,
        `${JSON.stringify(generatedAudit, null, 2)}\n`,
      );
      run();
      expect(
        (JSON.parse(readFileSync(generatedAuditPath, "utf8")) as Audit).review,
      ).toEqual(generatedAudit.review);

      const changedSource = readFileSync(tempSource, "utf8").replace(
        "无上甚深微妙法",
        "无上甚深微妙法改",
      );
      writeFileSync(tempSource, changedSource);
      expect(run).toThrow();
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
