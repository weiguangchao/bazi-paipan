import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "content/books/jingangjing/source.md");
const auditPath = path.join(root, "content/books/jingangjing/audit.json");
const catalogPath = path.join(root, "src/books/jingangjing/catalog.json");
const expectedSource = {
  sha256: "9f4ea469eacb17536dd4948f3aeaa70e65e67da8c0b7bd307495f988aab8762a",
  bytes: 20_541,
  lines: 148,
  codePoints: 7_017,
};
const expectedTitles = [
  "开经偈",
  "法会因由分第一",
  "善现启请分第二",
  "大乘正宗分第三",
  "妙行无住分第四",
  "如理实见分第五",
  "正信希有分第六",
  "无得无说分第七",
  "依法出生分第八",
  "一相无相分第九",
  "庄严净土分第十",
  "无为福胜分第十一",
  "尊重正教分第十二",
  "如法受持分第十三",
  "离相寂灭分第十四",
  "持经功德分第十五",
  "能净业障分第十六",
  "究竟无我分第十七",
  "一体同观分第十八",
  "法界通化分第十九",
  "离色离相分第二十",
  "非说所说分第二十一",
  "无法可得分第二十二",
  "净心行善分第二十三",
  "福智无比分第二十四",
  "化无所化分第二十五",
  "法身非相分第二十六",
  "无断无灭分第二十七",
  "不受不贪分第二十八",
  "威仪寂静分第二十九",
  "一合理相分第三十",
  "知见不生分第三十一",
  "应化非真分第三十二",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fail = (message) => {
  throw new Error(`《金刚般若波罗蜜经》导入失败：${message}`);
};

function assertSource(source, label) {
  const text = source.toString("utf8");
  const actual = {
    sha256: sha256(source),
    bytes: source.byteLength,
    lines: text.split("\n").length - 1,
    codePoints: [...text].length,
  };
  if (
    JSON.stringify(actual) !== JSON.stringify(expectedSource)
    || source.at(-1) !== 0x0a
    || source.includes(0x0d)
  ) {
    fail(`${label}指纹不符`);
  }
}

const source = readFileSync(sourcePath);
assertSource(source, "仓库原稿快照");
const sourceText = source.toString("utf8");
const lines = sourceText.split("\n");
lines.pop();

const lineStartBytes = [];
let byteOffset = 0;
for (const line of lines) {
  lineStartBytes.push(byteOffset);
  byteOffset += Buffer.byteLength(`${line}\n`);
}

function sourceRange(startLine, endLine) {
  return {
    startLine,
    endLine,
    startByte: lineStartBytes[startLine - 1] + 1,
    endByte:
      endLine === lines.length ? source.byteLength : lineStartBytes[endLine],
  };
}

const sliceRange = (range) =>
  source.subarray(range.startByte - 1, range.endByte);
const headings = lines.flatMap((line, index) => {
  const match = /^(#{1,6}) (.+)$/.exec(line);
  return match
    ? [{ level: match[1].length, title: match[2], line: index + 1 }]
    : [];
});
if (
  headings.length !== 34
  || headings.filter(({ level }) => level === 1).length !== 1
  || headings.filter(({ level }) => level === 2).length !== 33
  || headings.some(({ level }) => level > 2)
) {
  fail("34 / 1-33 heading 库存不成立");
}
if (headings[0]?.title !== "金刚般若波罗蜜经") {
  fail("H1 书名不符");
}
const chapterHeadings = headings.slice(1);
if (
  JSON.stringify(chapterHeadings.map(({ title }) => title))
  !== JSON.stringify(expectedTitles)
) {
  fail("33 个篇章原题或顺序不符");
}
if (chapterHeadings[0]?.line !== 3 || chapterHeadings[1]?.line !== 14) {
  fail("开经偈或第一分边界不符");
}

const chapters = chapterHeadings.map((heading, index) => {
  const order = index + 1;
  const chapterId = `v1-c${String(order).padStart(3, "0")}`;
  const endLine =
    index === 0
      ? 7
      : (chapterHeadings[index + 1]?.line ?? lines.length + 1) - 1;
  const range = sourceRange(heading.line, endLine);
  const raw = sliceRange(range);
  const headingBytes = Buffer.byteLength(`## ${heading.title}\n`);
  const body = raw.subarray(headingBytes);
  if (body.toString("utf8").trim() === "") fail(`${chapterId} 正文为空`);
  return {
    chapterId,
    title: heading.title,
    order,
    source: range,
    outputPath:
      `content/books/jingangjing/chapters/v1/${chapterId}.md`,
    rawBytes: raw.byteLength,
    bodyBytes: body.byteLength,
    sha256: sha256(raw),
  };
});

const structuralSegments = [
  {
    kind: "source-front-matter",
    purpose: "title",
    source: sourceRange(1, 2),
    sha256: "53da8afaa4acf99253e1070d0f552ae4818577922d3b0c205d70fd8ddd474613",
    catalogMapping: { title: "金刚般若波罗蜜经" },
    resolution: "H1 完整书名及相邻空行映射为 catalog 书名，不进入篇章正文",
  },
  {
    kind: "source-front-matter",
    purpose: "attribution",
    source: sourceRange(8, 13),
    sha256: "b08a443a1d280c44174c95f59bd0af1298573f4b52f89b0b5e98f1a3ec349e58",
    catalogMapping: {
      attribution: [{ name: "姚秦三藏法师鸠摩罗什", role: "译" }],
    },
    resolution: "分隔线、译者行及相邻空行映射为 catalog 署名，不进入篇章正文",
  },
].map((segment) => {
  const raw = sliceRange(segment.source);
  if (sha256(raw) !== segment.sha256) {
    fail(`${segment.purpose} 结构段 SHA-256 不符`);
  }
  return { ...segment, rawBytes: raw.byteLength };
});

const chapterBytes = chapters.reduce(
  (sum, chapter) => sum + chapter.rawBytes,
  0,
);
const structuralBytes = structuralSegments.reduce(
  (sum, segment) => sum + segment.rawBytes,
  0,
);
if (chapterBytes !== 20_468 || structuralBytes !== 73) {
  fail("篇章或结构段 bytes 合计不符");
}

const reconstructed = Buffer.concat([
  sliceRange(structuralSegments[0].source),
  sliceRange(chapters[0].source),
  sliceRange(structuralSegments[1].source),
  ...chapters.slice(1).map((chapter) => sliceRange(chapter.source)),
]);
if (!reconstructed.equals(source)) fail("反向拼接不能复现原稿");

const ownership = new Uint8Array(source.byteLength);
for (const item of [...chapters, ...structuralSegments]) {
  for (
    let index = item.source.startByte - 1;
    index < item.source.endByte;
    index += 1
  ) {
    ownership[index] += 1;
  }
}
const ownershipClosure = {
  unownedBytes: ownership.filter((count) => count === 0).length,
  uniquelyOwnedBytes: ownership.filter((count) => count === 1).length,
  duplicatedBytes: ownership.filter((count) => count > 1).length,
};
if (
  ownershipClosure.unownedBytes !== 0
  || ownershipClosure.uniquelyOwnedBytes !== expectedSource.bytes
  || ownershipClosure.duplicatedBytes !== 0
) {
  fail("byte 唯一所有权不闭合");
}
if (
  (lines[4].match(/\u3000/g) ?? []).length !== 1
  || (lines[5].match(/\u3000/g) ?? []).length !== 1
) {
  fail("开经偈 U+3000 库存不符");
}

const catalog = {
  book: {
    id: "jingangjing",
    order: 6,
    title: "金刚般若波罗蜜经",
    attribution: [{ name: "姚秦三藏法师鸠摩罗什", role: "译" }],
    description:
      "姚秦三藏法师鸠摩罗什译本，以全卷三十三篇阅读开经偈与三十二分经文正文。",
    sealLines: ["金刚", "经"],
  },
  volumes: [
    {
      id: "v1",
      title: "全卷",
      order: 1,
      chapters: chapters.map(({ chapterId, title, order }) => ({
        id: chapterId,
        title,
        volumeId: "v1",
        order,
      })),
    },
  ],
};

const generatedAudit = {
  schemaVersion: 1,
  sourceSnapshot: {
    path: "content/books/jingangjing/source.md",
    ...expectedSource,
  },
  inventory: {
    headingCount: 34,
    headingLevels: { h1: 1, h2: 33 },
    chapterCount: 33,
    structuralSegmentCount: 2,
    volumeCount: 1,
    volumes: [{ id: "v1", order: 1, chapterCount: 33 }],
  },
  volumeMapping: {
    volumeId: "v1",
    title: "全卷",
    sourceTitle: "",
    resolution: "原稿无显式卷次，以一个代表全书的阅读单元承载正文",
  },
  chapters,
  structuralSegments,
  ownershipClosure: {
    chapterBytes,
    structuralBytes,
    totalBytes: chapterBytes + structuralBytes,
    ...ownershipClosure,
    reconstructionSha256: sha256(reconstructed),
  },
  sourceAnomalies: {
    bom: 0,
    carriageReturns: 0,
    tabs: 0,
    trailingWhitespaceLines: 0,
    nul: 0,
    replacementCharacters: 0,
    u3000Lines: [5, 6],
  },
  warnings: [],
  knownExceptions: [],
};

let review = {
  status: "pending",
  checks: {
    chaptersReviewed: 0,
    structuralSegmentsReviewed: 0,
    omissions: 0,
    duplications: 0,
    orderingErrors: 0,
    silentRewrites: 0,
    unknownAnomalies: 0,
  },
};
if (existsSync(auditPath)) {
  const previous = JSON.parse(readFileSync(auditPath, "utf8"));
  const { review: previousReview, ...previousFacts } = previous;
  if (
    JSON.stringify(previousFacts) === JSON.stringify(generatedAudit)
    && previousReview
  ) {
    review = previousReview;
  }
}

for (const chapter of chapters) {
  const target = path.join(root, chapter.outputPath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, sliceRange(chapter.source));
}
mkdirSync(path.dirname(catalogPath), { recursive: true });
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
writeFileSync(
  auditPath,
  `${JSON.stringify({ ...generatedAudit, review }, null, 2)}\n`,
);

console.log("《金刚般若波罗蜜经》导入完成：1 卷、33 篇、20,541 bytes 闭合");
