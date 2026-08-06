import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "content/books/qiongtongbaojian/source.md");
const source = readFileSync(sourcePath);
const sourceText = source.toString("utf8");
const expectedSource = {
  sha256: "148c4cb70072d465162a0668864c623f08896065b9b1c1ec1f7aec78b30a5483",
  bytes: 125795,
  lines: 1889,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function fail(message) {
  throw new Error(`《穷通宝鉴》导入失败：${message}`);
}

const lines = sourceText.split("\n");
if (lines.at(-1) !== "") fail("原稿必须以 LF 结尾");
lines.pop();
if (
  sha256(source) !== expectedSource.sha256
  || source.byteLength !== expectedSource.bytes
  || lines.length !== expectedSource.lines
) {
  fail("仓库原稿快照指纹不符");
}

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
      endLine === lines.length
        ? source.byteLength
        : lineStartBytes[endLine],
  };
}

function sliceRange(range) {
  return source.subarray(range.startByte - 1, range.endByte);
}

const headings = lines.flatMap((line, index) => {
  const match = /^(#{1,6}) (.+)$/.exec(line);
  return match
    ? [{
        level: match[1].length,
        title: match[2],
        line: index + 1,
      }]
    : [];
});
if (
  headings.length !== 112
  || headings.filter(({ level }) => level === 1).length !== 1
  || headings.filter(({ level }) => level === 2).length !== 13
  || headings.filter(({ level }) => level === 3).length !== 22
  || headings.filter(({ level }) => level === 4).length !== 76
) {
  fail("112 / 1-13-22-76 heading 库存不成立");
}

const candidates = headings.slice(1).map((heading, index) => {
  const next = headings[index + 2];
  const endLine = next ? next.line - 1 : lines.length;
  const range = sourceRange(heading.line, endLine);
  const body = lines.slice(heading.line, endLine).join("\n");
  return {
    ...heading,
    endLine,
    range,
    bodyIsEmpty: body.trim() === "",
  };
});
if (candidates.length !== 111) fail("H1 后候选数不是 111");

const emptyTitles = candidates
  .filter(({ bodyIsEmpty }) => bodyIsEmpty)
  .map(({ title }) => title);
if (
  JSON.stringify(emptyTitles)
  !== JSON.stringify(["三夏丁火", "三秋丁火", "三冬丁火"])
) {
  fail(`空候选与决议不符：${emptyTitles.join("、")}`);
}

const chapters = [];
const structuralSegments = [];
let pendingPrefix;
for (const candidate of candidates) {
  if (candidate.bodyIsEmpty) {
    if (pendingPrefix) fail("出现连续空 heading");
    pendingPrefix = candidate;
    continue;
  }

  const order = chapters.length + 1;
  const chapterId = `v1-c${String(order).padStart(3, "0")}`;
  const range = sourceRange(
    pendingPrefix?.line ?? candidate.line,
    candidate.endLine,
  );
  const outputPath =
    `content/books/qiongtongbaojian/chapters/v1/${chapterId}.md`;
  const content = sliceRange(range);
  const chapter = {
    chapterId,
    title: candidate.title,
    headingLevel: candidate.level,
    source: range,
    outputPath,
    bytes: content.byteLength,
    sha256: sha256(content),
  };
  chapters.push(chapter);

  if (pendingPrefix) {
    structuralSegments.push({
      kind: "structural-prefix",
      title: pendingPrefix.title,
      source: pendingPrefix.range,
      attachedChapterId: chapterId,
      resolution: "空直系正文 heading 原样附于后继篇章，不形成独立篇章或第二份内容所有权",
    });
    pendingPrefix = undefined;
  }
}
if (pendingPrefix) fail("末尾空 heading 无后继篇章");
if (chapters.length !== 108) fail(`最终篇章数为 ${chapters.length}，不是 108`);

const chapterByTitle = new Map(chapters.map((chapter) => [chapter.title, chapter]));
if (chapterByTitle.size !== chapters.length) fail("发布篇章标题不唯一");
const chapterForTitle = (title) => {
  const chapter = chapterByTitle.get(title);
  if (!chapter) fail(`月份覆盖引用未知篇章：${title}`);
  return chapter;
};
const chapterForLine = (line) => {
  const chapter = chapters.find(
    ({ source: range }) => range.startLine <= line && line <= range.endLine,
  );
  if (!chapter) fail(`L${line} 未归属篇章`);
  return chapter;
};

const monthNames = [
  "正",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "十一",
  "十二",
];
const coverageTitles = {
  "甲": [
    "三春甲木", "三春甲木", "三春甲木",
    "三夏甲木", "三夏甲木", "三夏甲木",
    "三秋甲木", "三秋甲木", "三秋甲木",
    "三冬甲木", "三冬甲木", "三冬甲木",
  ],
  "乙": [
    "三春乙木", "三春乙木", "三春乙木",
    "三夏乙木", "三夏乙木", "三夏乙木",
    "三秋乙木", "三秋乙木", "三秋乙木",
    "三冬乙木", "三冬乙木", "三冬乙木",
  ],
  "丙": [
    "三春丙火",
    ...monthNames.slice(1).map((month) => `${month}月丙火`),
  ],
  "丁": [
    "三春丁火",
    "二月丁火",
    "三月丁火",
    "四月丁火",
    "五月丁火",
    "六月丁火",
    "七月丁火",
    "八九月丁火",
    "八九月丁火",
    "十月丁火",
    "十一月丁火",
    "十一月丁火",
  ],
  "戊": [
    "正二月戊土",
    "正二月戊土",
    ...monthNames.slice(2, 10).map((month) => `${month}月戊土`),
    "十一二月",
    "十一二月",
  ],
  "己": [
    "论己土",
    "二月己土",
    "三月己土",
    "三夏己土",
    "三夏己土",
    "三夏己土",
    "三秋己土",
    "三秋己土",
    "三秋己土",
    "三冬己土",
    "三冬己土",
    "三冬己土",
  ],
  "庚": [
    "论金",
    ...monthNames.slice(1).map((month) => `${month}月庚金`),
  ],
  "辛": [
    "论辛金",
    ...monthNames.slice(1).map((month) => `${month}月辛金`),
  ],
  "壬": [
    "论壬水",
    ...monthNames.slice(1).map((month) => `${month}月壬水`),
  ],
  "癸": [
    "论癸水",
    ...monthNames.slice(1).map((month) => `${month}月癸水`),
  ],
};
const monthCoverage = Object.entries(coverageTitles).flatMap(
  ([tiangan, titles]) =>
    titles.map((title, index) => {
      const chapter = chapterForTitle(title);
      return {
        tiangan,
        month: index + 1,
        chapterId: chapter.chapterId,
        source: chapter.source,
      };
    }),
);
if (monthCoverage.length !== 120) fail("月份覆盖不是 120 项");

function consecutiveRanges(predicate) {
  const ranges = [];
  let startLine;
  for (let index = 0; index <= lines.length; index += 1) {
    const matches = index < lines.length && predicate(lines[index]);
    if (matches && startLine === undefined) startLine = index + 1;
    if (!matches && startLine !== undefined) {
      ranges.push(sourceRange(startLine, index));
      startLine = undefined;
    }
  }
  return ranges;
}

const pipeRanges = consecutiveRanges((line) => line.startsWith("|"));
if (
  pipeRanges.length !== 188
  || pipeRanges.some((range) => range.endLine - range.startLine + 1 !== 3)
) {
  fail("188 个三行命例表库存不成立");
}
const commentaryRanges = consecutiveRanges((line) => line.startsWith(">"))
  .filter((range) =>
    lines[range.startLine - 1].includes("【徐乐吾评注】")
  );
if (commentaryRanges.length !== 28) fail("28 个徐乐吾评注块库存不成立");

for (const range of [...pipeRanges, ...commentaryRanges]) {
  const owners = chapters.filter(
    (chapter) =>
      chapter.source.startLine <= range.startLine
      && range.endLine <= chapter.source.endLine,
  );
  if (owners.length !== 1) {
    fail(`L${range.startLine}–L${range.endLine} 内容块篇章归属不唯一`);
  }
}

const plainTextLabelSpecs = [
  ["season", "春月之土", 795],
  ["season", "夏月之土", 797],
  ["season", "秋月之土", 799],
  ["season", "冬月之土", 801],
  ["month", "正月丙火：", 303],
  ["month", "正月丁火：", 567],
  ["month", "正月己土：", 1008],
  ["month", "正月庚金：", 1133],
  ["month", "正月辛金：", 1327],
  ["month", "正月壬水：", 1536],
  ["month", "正月癸水：", 1719],
];
const plainTextLabels = plainTextLabelSpecs.map(([kind, text, sourceLine]) => {
  if (lines[sourceLine - 1] !== text) {
    fail(`L${sourceLine} 纯文本标签应为 ${text}`);
  }
  return {
    kind,
    text,
    sourceLine,
    chapterId: chapterForLine(sourceLine).chapterId,
  };
});

const mergedMonthHeadings = [
  { title: "正二月戊土", months: ["正月", "二月"] },
  { title: "八九月丁火", months: ["八月", "九月"] },
  { title: "十一二月", months: ["十一月", "十二月"] },
].map((entry) => ({
  ...entry,
  chapterId: chapterForTitle(entry.title).chapterId,
}));

const frontMatterRange = sourceRange(1, 9);
const audit = {
  schemaVersion: 1,
  sourceSnapshot: {
    path: "content/books/qiongtongbaojian/source.md",
    ...expectedSource,
  },
  inventory: {
    headingCount: 112,
    candidateCount: 111,
    chapterCount: 108,
    headingLevels: { h1: 1, h2: 13, h3: 22, h4: 76 },
    volumeCount: 1,
    volumes: [{ id: "v1", order: 1, chapterCount: 108 }],
  },
  volumeMapping: {
    volumeId: "v1",
    title: "全卷",
    sourceTitle: "",
    resolution: "原稿无显式卷次，以一个代表全书的阅读单元承载正文",
  },
  frontMatter: {
    kind: "source-front-matter",
    source: frontMatterRange,
    sha256: sha256(sliceRange(frontMatterRange)),
    catalogMapping: {
      title: "穷通宝鉴",
      attributions: [
        { name: "（清）余春台", role: "辑" },
        { name: "徐乐吾", role: "评注" },
      ],
      versionMarker: "徐乐吾评注版",
    },
    resolution: "H1 书壳、署名、分隔线与版本标记映射为 catalog 元数据，不进入篇章正文",
  },
  chapters,
  structuralSegments,
  headingLevelJumps: [
    { fromLine: 1006, toLine: 1017, fromLevel: 2, toLevel: 4 },
    { fromLine: 1122, toLine: 1149, fromLevel: 2, toLevel: 4 },
    { fromLine: 1325, toLine: 1338, fromLevel: 2, toLevel: 4 },
    { fromLine: 1534, toLine: 1548, fromLevel: 2, toLevel: 4 },
    { fromLine: 1717, toLine: 1727, fromLevel: 2, toLevel: 4 },
  ],
  plainTextLabels,
  mergedMonthHeadings,
  missingStandaloneHeadings: [
    {
      title: "十二月丁火",
      chapterId: chapterForTitle("十一月丁火").chapterId,
      resolution: "原稿无独立标题，丑月命例与三冬总结保持归属十一月丁火篇章",
    },
  ],
  monthCoverage,
  contentBlocks: {
    exampleTables: { count: pipeRanges.length, ranges: pipeRanges },
    commentary: { count: commentaryRanges.length, ranges: commentaryRanges },
    crossScopeCommentary: [
      {
        source: sourceRange(360, 362),
        chapterId: chapterForLine(360).chapterId,
        resolution: "评注位于三月丙火篇章但跨述三春、正月与二月，保持原位",
      },
      {
        source: sourceRange(552, 556),
        chapterId: chapterForLine(552).chapterId,
        resolution: "评注位于十二月丙火篇章但语义回顾三夏丙火，保持原位",
      },
      {
        source: sourceRange(611, 615),
        chapterId: chapterForLine(611).chapterId,
        resolution: "评注位于三月丁火篇章但跨述正月与二月，保持原位",
      },
      {
        source: sourceRange(681, 685),
        chapterId: chapterForLine(681).chapterId,
        resolution: "评注位于六月丁火篇章但跨述四月与五月，保持原位",
      },
      {
        source: sourceRange(734, 736),
        chapterId: chapterForLine(734).chapterId,
        resolution: "评注位于八九月丁火篇章但跨述七月，保持原位",
      },
      {
        source: sourceRange(786, 788),
        chapterId: chapterForLine(786).chapterId,
        resolution: "评注位于十一月丁火篇章但以三冬与仲冬语义跨述十月，保持原位",
      },
      {
        source: sourceRange(1051, 1057),
        chapterId: chapterForLine(1051).chapterId,
        resolution: "评注位于三月己土篇章但跨述正月与三季，保持原位",
      },
      {
        source: sourceRange(1320, 1322),
        chapterId: chapterForLine(1320).chapterId,
        resolution: "评注位于十二月庚金篇章但跨述春夏秋冬四季，保持原位",
      },
      {
        source: sourceRange(1507, 1513),
        chapterId: chapterForLine(1507).chapterId,
        resolution: "评注位于十二月辛金篇章但跨述正月、七月至冬月，保持原位",
      },
      {
        source: sourceRange(1708, 1714),
        chapterId: chapterForLine(1708).chapterId,
        resolution: "评注位于十二月壬水篇章但跨述正月、四月、七月、十月及冬月，保持原位",
      },
      {
        source: sourceRange(1880, 1888),
        chapterId: chapterForLine(1880).chapterId,
        resolution: "评注位于十二月癸水篇章但跨述癸水多个季节，保持原位",
      },
    ],
  },
  warnings: [],
  knownExceptions: [],
  review: {
    importedAt: "2026-07-29",
    importer: "Codex primary agent",
    independentReviewer: "pending independent content audit agent",
    reviewedAt: "",
    conclusion: "pending",
    checks: {},
  },
};

const auditPath = path.join(
  root,
  "content/books/qiongtongbaojian/audit.json",
);
try {
  const previousAudit = JSON.parse(readFileSync(auditPath, "utf8"));
  const {
    review: previousReview,
    ...previousGeneratedAudit
  } = previousAudit;
  const {
    review: _pendingReview,
    ...nextGeneratedAudit
  } = audit;
  if (
    previousReview
    && JSON.stringify(previousGeneratedAudit) === JSON.stringify(nextGeneratedAudit)
  ) {
    audit.review = previousReview;
  }
} catch {
  // 首次导入没有既有审计；内容或结构变化时保持 pending，等待重新独立复核。
}

const catalog = {
  book: {
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
  },
  volumes: [{
    id: "v1",
    title: "全卷",
    order: 1,
    chapters: chapters.map((chapter, index) => ({
      id: chapter.chapterId,
      title: chapter.title,
      volumeId: "v1",
      order: index + 1,
    })),
  }],
};

for (const chapter of chapters) {
  const target = path.join(root, chapter.outputPath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, sliceRange(chapter.source));
}
mkdirSync(path.join(root, "src/books/qiongtongbaojian"), { recursive: true });
writeFileSync(
  auditPath,
  `${JSON.stringify(audit, null, 2)}\n`,
);
writeFileSync(
  path.join(root, "src/books/qiongtongbaojian/catalog.json"),
  `${JSON.stringify(catalog, null, 2)}\n`,
);

console.log("《穷通宝鉴》内容包已确定生成：1 卷、108 篇");
