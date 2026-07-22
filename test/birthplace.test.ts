import { describe, it, expect } from "vitest";
import { findLongitude } from "../src/birthplace.js";

describe("出生地经度查找 (T5)", () => {
  // 真值取自 city-geo 数据源（见 cities.generated.ts）：成都 ~104.08°
  it("已知省/市 -> 返回经度：四川省/成都市 ~104.08°", () => {
    const r = findLongitude({ province: "四川省", city: "成都市" });
    expect(r).toEqual({ found: true, longitude: 104.081534 });
  });

  it("直辖市：北京市/市辖区 -> ~116.41°", () => {
    const r = findLongitude({ province: "北京市", city: "市辖区" });
    expect(r.found).toBe(true);
    if (r.found) expect(r.longitude).toBeCloseTo(116.413384, 4);
  });

  it("西部城市：新疆维吾尔自治区/喀什地区 -> ~75.99°（经度修正显著）", () => {
    const r = findLongitude({ province: "新疆维吾尔自治区", city: "喀什地区" });
    expect(r).toEqual({ found: true, longitude: 75.996391 });
  });

  it("未知省份 -> 找到:false, 原因:未知省份", () => {
    expect(findLongitude({ province: "火星省", city: "某市" })).toEqual({
      found: false,
      reason: "未知省份",
    });
  });

  it("已知省/未知城市 -> 找到:false, 原因:未知城市", () => {
    expect(findLongitude({ province: "四川省", city: "不存在的市" })).toEqual({
      found: false,
      reason: "未知城市",
    });
  });
});
