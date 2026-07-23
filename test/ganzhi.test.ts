import { describe, expect, expectTypeOf, it } from "vitest";
import {
  assertGanzhi,
  ganzhiFromCharacters,
  isDizhi,
  isGanzhi,
  isTiangan,
  liushijiazi,
  type Dizhi,
  type Ganzhi,
  type Tiangan,
} from "../src/ganzhi.js";

describe("干支规范值", () => {
  it("窄类型由规范值函数公开", () => {
    expectTypeOf<Tiangan>().toEqualTypeOf<
      "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸"
    >();
    expectTypeOf<Dizhi>().toEqualTypeOf<
      "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥"
    >();
    expectTypeOf(liushijiazi(0)).toEqualTypeOf<Ganzhi>();
  });

  it("接受全部 60 个六十甲子且不重复", () => {
    const values = Array.from({ length: 60 }, (_, index) => liushijiazi(index));

    expect(new Set(values)).toHaveLength(60);
    expect(values.every(isGanzhi)).toBe(true);
  });

  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "拒绝不能生成合法干支的索引 %s",
    (index) => {
      expect(() => liushijiazi(index)).toThrow(RangeError);
    },
  );

  it.each([
    ["甲丑", "天干地支奇偶不匹配"],
    ["", "缺字"],
    ["甲", "缺字"],
    ["甲子丑", "多字"],
    ["A子", "未知天干"],
    ["甲A", "未知地支"],
  ])("拒绝非法干支 %s（%s）", (value) => {
    expect(isGanzhi(value)).toBe(false);
    expect(() => assertGanzhi(value)).toThrow(RangeError);
  });

  it("公开天干与地支运行时判断", () => {
    expect(isTiangan("甲")).toBe(true);
    expect(isTiangan("子")).toBe(false);
    expect(isDizhi("子")).toBe(true);
    expect(isDizhi("甲")).toBe(false);
  });

  it("从规范天干地支构造时仍校验六十甲子", () => {
    expect(ganzhiFromCharacters("甲", "子")).toBe("甲子");
    expect(() => ganzhiFromCharacters("甲", "丑")).toThrow(RangeError);
  });
});
