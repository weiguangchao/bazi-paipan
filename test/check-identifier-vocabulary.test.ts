import { describe, expect, it } from "vitest";
import {
  findDeprecatedPinyinIdentifiers,
  findDeprecatedPinyinNaming,
  formatDeprecatedPinyinViolation,
} from "../scripts/check-identifier-vocabulary.mjs";

describe("标识符术语守卫", () => {
  it("拒绝历史拆分拼音及包含它们的复合标识符", () => {
    const source = [
      "const siZhu = {};",
      "const parseGanZhi = () => {};",
      "const getShiShen = () => {};",
      "const cangGanTable = {};",
      "const qiYunAge = 8;",
    ].join("\n");

    expect(findDeprecatedPinyinIdentifiers(source)).toEqual([
      expect.objectContaining({ identifier: "siZhu", deprecatedToken: "siZhu", canonicalToken: "sizhu" }),
      expect.objectContaining({ identifier: "parseGanZhi", deprecatedToken: "GanZhi", canonicalToken: "ganzhi" }),
      expect.objectContaining({ identifier: "getShiShen", deprecatedToken: "ShiShen", canonicalToken: "shishen" }),
      expect.objectContaining({ identifier: "cangGanTable", deprecatedToken: "cangGan", canonicalToken: "canggan" }),
      expect.objectContaining({ identifier: "qiYunAge", deprecatedToken: "qiYun", canonicalToken: "qiyun" }),
    ]);
  });

  it("报告文件、行、列和规范 token", () => {
    const violation = findDeprecatedPinyinIdentifiers("const shiShen = 1;")[0]!;
    expect(formatDeprecatedPinyinViolation("fixture.ts", violation)).toBe(
      "fixture.ts:1:7 deprecated pinyin token shiShen in identifier shiShen; use shishen",
    );
  });

  it("允许规范 token、通用英文以及中文注释和文案", () => {
    const source = '// 十神\nconst shishenLabel = "十神";\nconst responseBody = {};';
    expect(findDeprecatedPinyinIdentifiers(source)).toEqual([]);
  });

  it("拒绝 TypeScript/JavaScript 标识符中大小写形式的 pillar", () => {
    const source = [
      "const pillar = {};",
      "class PillarCard {}",
      "const PILLAR_LIMIT = 10;",
      "const mixedPiLlArName = '';",
    ].join("\n");

    expect(findDeprecatedPinyinIdentifiers(source)).toEqual([
      expect.objectContaining({ context: "identifier", naming: "pillar", canonicalToken: "zhu" }),
      expect.objectContaining({ context: "identifier", naming: "PillarCard", canonicalToken: "zhu" }),
      expect.objectContaining({ context: "identifier", naming: "PILLAR_LIMIT", canonicalToken: "zhu" }),
      expect.objectContaining({ context: "identifier", naming: "mixedPiLlArName", canonicalToken: "zhu" }),
    ]);
  });

  it("拒绝 HTML class 与 id 中的 pillar 命名", () => {
    const source = [
      '<section id="pillar-grid">',
      '  <div class="result PillarCard"></div>',
      "</section>",
    ].join("\n");

    expect(findDeprecatedPinyinNaming(source, "fixture.html")).toEqual([
      expect.objectContaining({ context: "HTML id", naming: "pillar-grid", line: 1 }),
      expect.objectContaining({ context: "HTML class", naming: "PillarCard", line: 2 }),
    ]);
  });

  it("拒绝 CSS selector 中的 pillar 命名", () => {
    const source = [
      ".pillar-card, #PillarGrid { display: block; }",
      "@media (width < 600px) {",
      "  .compact-PILLAR-row { gap: 4px; }",
      "}",
    ].join("\n");

    expect(findDeprecatedPinyinNaming(source, "fixture.css")).toEqual([
      expect.objectContaining({ context: "CSS selector", naming: ".pillar-card", line: 1 }),
      expect.objectContaining({ context: "CSS selector", naming: "#PillarGrid", line: 1 }),
      expect.objectContaining({ context: "CSS selector", naming: ".compact-PILLAR-row", line: 3 }),
    ]);
  });

  it("拒绝应用与测试代码的 DOM selector 中的 pillar 命名", () => {
    const source = [
      'document.querySelector("#pillar-grid .PillarCard");',
      'page.locator(".compact-PILLAR-row");',
    ].join("\n");

    expect(findDeprecatedPinyinNaming(source, "fixture.ts")).toEqual([
      expect.objectContaining({ context: "DOM selector", naming: "#pillar-grid", line: 1 }),
      expect.objectContaining({ context: "DOM selector", naming: ".PillarCard", line: 1 }),
      expect.objectContaining({ context: "DOM selector", naming: ".compact-PILLAR-row", line: 2 }),
    ]);
  });

  it("pillar 违规报告包含位置、违规命名和规范 token", () => {
    const violation = findDeprecatedPinyinNaming(
      '<div class="pillar-card"></div>',
      "fixture.html",
    )[0]!;

    expect(formatDeprecatedPinyinViolation("fixture.html", violation)).toBe(
      "fixture.html:1:13 deprecated domain token pillar in HTML class pillar-card; use zhu or a more specific canonical token",
    );
  });

  it("允许注释、测试标题和面向用户的 Pillar 展示文案", () => {
    const source = [
      "// Pillar is the English translation in this comment.",
      'it("Pillar cards stay readable", () => {',
      '  const heading = "Pillar details";',
      "});",
    ].join("\n");
    const html = [
      '<!-- <div class="pillar-card"></div> -->',
      '<p title="Pillar details">Pillar details</p>',
    ].join("\n");
    const css = [
      "/* .pillar-card { display: block; } */",
      '.copy::after { content: "Pillar details"; }',
    ].join("\n");

    expect(findDeprecatedPinyinNaming(source, "fixture.ts")).toEqual([]);
    expect(findDeprecatedPinyinNaming(html, "fixture.html")).toEqual([]);
    expect(findDeprecatedPinyinNaming(css, "fixture.css")).toEqual([]);
  });
});
