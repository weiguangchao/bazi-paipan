import { describe, it, expect } from "vitest";
import { resolveSingleCity } from "@/components/paipan-form/birthplace-auto-city";

// 自动携带唯一城市：省恰好有一个城市时返回该城市，否则返回空串。
// 阈值 = 严格等于 1（grilling 决议）：北京市/天津市/上海市触发；重庆市(2)及多城市省不触发。
// 城市名取自 cities.generated.ts 数据 key（如"市辖区"），不做展示层替换。
describe("resolveSingleCity", () => {
  it("北京市(1) -> 市辖区", () => {
    expect(resolveSingleCity("北京市")).toBe("市辖区");
  });

  it("天津市(1) -> 市辖区", () => {
    expect(resolveSingleCity("天津市")).toBe("市辖区");
  });

  it("上海市(1) -> 市辖区", () => {
    expect(resolveSingleCity("上海市")).toBe("市辖区");
  });

  it("重庆市(2) -> 空串（直辖市但不触发）", () => {
    expect(resolveSingleCity("重庆市")).toBe("");
  });

  it("河北省(11) -> 空串（多城市省）", () => {
    expect(resolveSingleCity("河北省")).toBe("");
  });

  it("海南省(4) -> 空串（接近 1 但不触发）", () => {
    expect(resolveSingleCity("海南省")).toBe("");
  });

  it("空省 -> 空串", () => {
    expect(resolveSingleCity("")).toBe("");
  });

  it("未知省 -> 空串（不抛错）", () => {
    expect(resolveSingleCity("火星省")).toBe("");
  });
});
