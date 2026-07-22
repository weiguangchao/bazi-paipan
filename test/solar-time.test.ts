import { describe, it, expect } from "vitest";
import { longitudeCorrectionMinutes, applyLongitudeCorrection, referenceLongitude, minutesPerDegree, trueSolarTimeOffsetMinutes, applyTrueSolarTime } from "../src/solar-time.js";
import { equationOfTimeMinutes } from "../src/eot.js";

describe("经度修正 - 偏移量计算 (T5)", () => {
  // CONTEXT.md：经度修正 = (经度 − 120°) × 4 分钟/度
  it("常量：参考经度 120°、每度 4 分钟", () => {
    expect(referenceLongitude).toBe(120);
    expect(minutesPerDegree).toBe(4);
  });

  it("中央经线 120° -> 偏移 0 分钟", () => {
    expect(longitudeCorrectionMinutes(120)).toBe(0);
  });

  it("东偏 1°（121°）-> +4 分钟", () => {
    expect(longitudeCorrectionMinutes(121)).toBe(4);
  });

  it("西偏 1°（119°）-> −4 分钟", () => {
    expect(longitudeCorrectionMinutes(119)).toBe(-4);
  });

  // 成都约 104.08°E，真太阳时比钟表时晚约 63.7 分钟。
  it("成都 ~104.08° -> 约 −63.7 分钟", () => {
    const m = longitudeCorrectionMinutes(104.081534);
    expect(m).toBeCloseTo(-63.673864, 4);
  });

  // 上海约 121.48°E，真太阳时比钟表时早约 5.9 分钟（即 +5.9）。
  it("上海 ~121.48° -> 约 +5.9 分钟", () => {
    const m = longitudeCorrectionMinutes(121.480539);
    expect(m).toBeCloseTo(5.922156, 4);
  });
});

describe("经度修正 - 时间戳平移 (T5)", () => {
  // 2000-01-01 12:00 钟表时（北京时间）= UTC 2000-01-01 04:00
  const base = Date.UTC(2000, 0, 1, 4, 0);

  it("120° 中央经线 -> 时间戳不变", () => {
    expect(applyLongitudeCorrection(base, 120)).toBe(base);
  });

  it("121° -> 时间戳 +4 分钟（240_000 ms）", () => {
    expect(applyLongitudeCorrection(base, 121)).toBe(base + 4 * 60_000);
  });

  it("116° -> 时间戳 −16 分钟", () => {
    expect(applyLongitudeCorrection(base, 116)).toBe(base - 16 * 60_000);
  });

  it("104° -> 时间戳 −64 分钟", () => {
    expect(applyLongitudeCorrection(base, 104)).toBe(base - 64 * 60_000);
  });
});

describe("真太阳时合成（经度修正 + 均时差）(#15)", () => {
  // 真太阳时 = 钟表时 + 经度修正 + 均时差（CONTEXT.md）。
  // 经度修正代表平太阳时层级（既有函数保留）；均时差在出生 UTC 时刻求值，与经度无关。
  // 应用真太阳时 = 钟表时时间戳 + (经度修正 + 均时差) × 60_000 ms。

  // 中央经线 + 均时差零点日期 -> 总偏移 ≈ 0，时间戳不变。
  // 4 月 15 日均时差 ≈ 0（eot.test.ts 锚点），120° 经度修正 = 0。
  it("中央经线 120° + 均时差零点日期（4-15）-> 总偏移 ≈ 0、时间戳不变", () => {
    const t = Date.UTC(2026, 3, 15, 4, 0); // 北京时间 12:00
    const offset = trueSolarTimeOffsetMinutes(t, 120);
    expect(Math.abs(offset)).toBeLessThan(2); // 均时差零点附近 ±2 分
    expect(applyTrueSolarTime(t, 120)).toBe(t + offset * 60_000);
  });

  // 极端经度 + 均时差极值日期 -> 总偏移 = 经度修正 + 均时差。
  // 11 月 3 日均时差 ≈ +16 分，喀什 ~76°E 经度修正 ≈ −176 分 -> 总偏移 ≈ −160 分。
  it("喀什 76° + 11 月初均时差极值 -> 总偏移 ≈ 经度修正 + 均时差 ≈ −160 分", () => {
    const t = Date.UTC(2026, 10, 3, 4, 0); // 北京时间 12:00
    const lng = 75.996;
    const offset = trueSolarTimeOffsetMinutes(t, lng);
    const expected = longitudeCorrectionMinutes(lng) + equationOfTimeMinutes(t);
    expect(offset).toBeCloseTo(expected, 4);
    // 经度修正 ≈ −176、均时差 ≈ +16 -> 总偏移 ≈ −160
    expect(offset).toBeLessThan(-155);
    expect(offset).toBeGreaterThan(-165);
  });

  // 双鸭山 ~131° + 2 月中均时差极值 -> 总偏移 ≈ +45 + (−14) ≈ +31 分。
  it("双鸭山 131° + 2 月中均时差极值 -> 总偏移 ≈ +31 分", () => {
    const t = Date.UTC(2026, 1, 11, 4, 0); // 北京时间 12:00
    const lng = 131.165;
    const offset = trueSolarTimeOffsetMinutes(t, lng);
    const expected = longitudeCorrectionMinutes(lng) + equationOfTimeMinutes(t);
    expect(offset).toBeCloseTo(expected, 4);
    expect(offset).toBeGreaterThan(25);
    expect(offset).toBeLessThan(40);
  });

  // 合成函数的均时差在出生 UTC 时刻求值，与经度无关：
  // 同一 UTC 时刻、不同经度，均时差分量相同，总偏移之差 = 经度修正之差。
  it("同一 UTC 时刻不同经度 -> 总偏移之差 = 经度修正之差（均时差与经度无关）", () => {
    const t = Date.UTC(2026, 10, 3, 4, 0);
    const o1 = trueSolarTimeOffsetMinutes(t, 75.996);
    const o2 = trueSolarTimeOffsetMinutes(t, 131.165);
    const eot = equationOfTimeMinutes(t);
    // o1 = 经度修正(76°) + eot, o2 = 经度修正(131°) + eot -> o2 - o1 = 经度修正差
    expect(o2 - o1).toBeCloseTo(longitudeCorrectionMinutes(131.165) - longitudeCorrectionMinutes(75.996), 4);
    // 均时差分量相同：o1 - 经度修正(76°) = o2 - 经度修正(131°) = eot
    expect(o1 - longitudeCorrectionMinutes(75.996)).toBeCloseTo(eot, 4);
    expect(o2 - longitudeCorrectionMinutes(131.165)).toBeCloseTo(eot, 4);
  });

  // 应用真太阳时 = 时间戳 + 总偏移 × 60_000 ms。
  it("应用真太阳时 = 钟表时时间戳 + 总偏移分钟数 × 60_000 ms", () => {
    const t = Date.UTC(2000, 0, 1, 4, 0); // 北京时间 2000-01-01 12:00
    const lng = 104.081534; // 成都
    const offset = trueSolarTimeOffsetMinutes(t, lng);
    expect(applyTrueSolarTime(t, lng)).toBe(t + offset * 60_000);
  });

  // 平太阳时（既有应用经度修正）与真太阳时（应用真太阳时）之差 = 均时差。
  it("真太阳时 − 平太阳时 = 均时差（验证两层关系）", () => {
    const t = Date.UTC(2026, 10, 3, 4, 0); // 11 月初，均时差 ≈ +16
    const lng = 116.413; // 北京
    const 平太阳 = applyLongitudeCorrection(t, lng);
    const 真太阳 = applyTrueSolarTime(t, lng);
    expect(真太阳 - 平太阳).toBeCloseTo(equationOfTimeMinutes(t) * 60_000, 0);
  });
});
