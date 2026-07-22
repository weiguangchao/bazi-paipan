import { describe, expect, it } from "vitest";
import {
  findDeprecatedPinyinIdentifiers,
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
});
