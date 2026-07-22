import { describe, expect, it } from "vitest";
import { findNonAsciiIdentifiers, formatViolation } from "../scripts/check-ascii-identifiers.mjs";

describe("ASCII 标识符守卫", () => {
  it("拒绝非 ASCII 标识符并报告文件、行、列", () => {
    const source = "const 排盘 = 1;";
    const violation = findNonAsciiIdentifiers(source)[0]!;
    expect(formatViolation("fixture.ts", violation)).toBe("fixture.ts:1:7 non-ASCII identifier 排盘");
  });

  it("拒绝 Unicode 转义后的标识符", () => {
    const source = "const \\u6392\\u76d8 = 1;";
    expect(findNonAsciiIdentifiers(source)).toHaveLength(1);
  });

  it("拒绝私有字段及其 Unicode 转义标识符", () => {
    expect(findNonAsciiIdentifiers("class Example { #排盘 = 1; }")).toHaveLength(1);
    expect(findNonAsciiIdentifiers("class Example { #\\u6392\\u76d8 = 1; }")).toHaveLength(1);
  });

  it("允许中文注释、字符串和业务数据", () => {
    const source = "// 排盘\nconst label = \"八字\";\nconst city = { \"北京市\": 1 };";
    expect(findNonAsciiIdentifiers(source)).toEqual([]);
  });
});
